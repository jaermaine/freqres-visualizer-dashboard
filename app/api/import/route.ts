import { NextRequest, NextResponse } from "next/server";
import { parseSourceUrl, sourceLabel } from "@/lib/parseSourceUrl";
import {
  parseMeasurementText,
  parseMeasurementTextMultiChannel,
  type MultiChannelParsedCurve,
} from "@/lib/parseMeasurementFile";
import { resolveSquigUrls } from "@/lib/resolveSquigUrl";
import { verifyUrlSafety, extractClientIp, checkInMemoryRateLimit } from "@/lib/security";
import { PARSER_ERROR_MESSAGES } from "@/lib/errorMessages";
import type { ImportResult, CurveData } from "@/types/audio";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

async function readStreamSafely(resp: Response): Promise<string> {
  if (!resp.body) return "";

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      downloadedSize += value.length;
      if (downloadedSize > MAX_FILE_SIZE) {
        reader.cancel("File exceeded 2MB limit");
        throw new Error("Payload Too Large");
      }
      chunks.push(value);
    }
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(combined);
}

async function fetchFirstValidStream(urls: string[]): Promise<{ text: string; url: string } | null> {
  for (const u of urls) {
    try {
      const resp = await fetch(u, {
        headers: { Accept: "text/plain,text/csv,*/*" },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok && !(resp.headers.get("content-type") ?? "").includes("text/html")) {
        const text = await readStreamSafely(resp);
        if (text && text.trim().length > 0) {
          return { text, url: u };
        }
      }
    } catch {
      // try next fallback URL
    }
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse<ImportResult>> {
  // 1. Bounded Rate Limiting Check
  const ip = extractClientIp(req.headers, req.ip);
  if (!checkInMemoryRateLimit(`import:${ip}`, MAX_REQUESTS, RATE_LIMIT_WINDOW)) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_URL", message: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const url = typeof body.url === "string" ? body.url : "";
  const channelMode = body.channelMode === "separate" ? "separate" : "avg";

  // 2. Input Validation
  if (!url || url.length > 1000) {
    return NextResponse.json(
      { ok: false, code: "INVALID_URL", message: "URL is empty or exceeds maximum allowed length (1000 characters)." },
      { status: 400 }
    );
  }

  const parsed = parseSourceUrl(url);

  // ── Auto-Resolution (Squiglink & Hangout) ─────────────────────────────────
  if (parsed.kind === "squiglink-share-url" || parsed.kind === "hangout-graph-url") {
    const baseUrl = parsed.baseUrl;

    // SSRF Mitigation: Validate host/DNS on graph URLs as well
    const safetyCheck = await verifyUrlSafety(baseUrl);
    if (!safetyCheck.safe) {
      return NextResponse.json(
        { ok: false, code: "SECURITY_BLOCK", message: `Request blocked for security reasons: ${safetyCheck.reason}` },
        { status: 403 }
      );
    }

    if (parsed.models.length > 0) {
      try {
        const resolved = await resolveSquigUrls(
          baseUrl,
          parsed.models.map((m) => m.raw)
        );

        if (resolved.length > 0) {
          // Fetch all resolved models & their L/R channels concurrently
          const perEntryCurves = await Promise.all(
            resolved.map(async (entry): Promise<CurveData[]> => {
              const leftUrls = entry.leftUrls ?? [entry.leftUrl];
              const rightUrls = entry.rightUrls ?? [entry.rightUrl];
              const fallbackUrls = entry.fallbackUrls ?? [entry.fallbackUrl];

              // Fetch Left and Right channels in parallel
              const [resL, resR] = await Promise.all([
                fetchFirstValidStream(leftUrls),
                fetchFirstValidStream(rightUrls),
              ]);

              let leftCurve: CurveData | null = null;
              let rightCurve: CurveData | null = null;

              if (resL) {
                const pL = parseMeasurementText(resL.text);
                if (pL.ok) {
                  leftCurve = {
                    label: `${entry.label} (L)`,
                    channel: "L",
                    pointCount: pL.points.length,
                    normalized: pL.normalized,
                  };
                }
              }

              if (resR) {
                const pR = parseMeasurementText(resR.text);
                if (pR.ok) {
                  rightCurve = {
                    label: `${entry.label} (R)`,
                    channel: "R",
                    pointCount: pR.points.length,
                    normalized: pR.normalized,
                  };
                }
              }

              if (leftCurve && rightCurve) {
                const rawChannels = { left: leftCurve.normalized, right: rightCurve.normalized };
                if (channelMode === "separate") {
                  return [
                    { ...leftCurve, rawChannels },
                    { ...rightCurve, rawChannels },
                  ];
                }
                const hz = leftCurve.normalized.hz;
                const db = hz.map((_, i) => (leftCurve!.normalized.db[i] + rightCurve!.normalized.db[i]) / 2);
                const avgCount = Math.round(((leftCurve.pointCount ?? 0) + (rightCurve.pointCount ?? 0)) / 2);
                return [
                  {
                    label: entry.label,
                    channel: "avg",
                    pointCount: avgCount,
                    normalized: { hz, db },
                    rawChannels,
                  },
                ];
              }

              if (leftCurve) {
                return [{ ...leftCurve, label: entry.label, channel: "avg" }];
              }
              if (rightCurve) {
                return [{ ...rightCurve, label: entry.label, channel: "avg" }];
              }

              // Fallback to bare .txt file only when both L and R failed
              const resFb = await fetchFirstValidStream(fallbackUrls);
              if (resFb) {
                const pFb = parseMeasurementText(resFb.text);
                if (pFb.ok) {
                  return [
                    {
                      label: entry.label,
                      channel: "avg",
                      pointCount: pFb.points.length,
                      normalized: pFb.normalized,
                    },
                  ];
                }
              }

              return [];
            })
          );

          const curves = perEntryCurves.flat();
          if (curves.length > 0) {
            return NextResponse.json({
              ok: true,
              mode: "fr-data",
              source: parsed,
              curves,
            });
          }
        }
      } catch (resolveErr) {
        void resolveErr;
      }
    }

    // Fallback: return metadata-only with helpful message
    return NextResponse.json({
      ok: true,
      mode: "metadata-only",
      source: parsed,
      curves: [],
      label: sourceLabel(parsed),
      message: `Graph URL detected. Models: ${
        parsed.models.map((m) => m.label).join(", ") || "(none)"
      }. Could not automatically resolve measurement data — the model may not be in this site's phone book, or the host blocked the request. Try pasting a direct .txt URL instead.`,
    });
  }

  // ── Unsupported URL ───────────────────────────────────────────────────────
  if (parsed.kind === "unsupported-url") {
    return NextResponse.json(
      { ok: false, code: "UNSUPPORTED_URL", message: parsed.reason },
      { status: 400 }
    );
  }

  // ── Raw measurement file: fetch and parse ─────────────────────────────────
  const fetchUrl = parsed.url.replace(/ /g, "%20");

  // SSRF Mitigation: Validate IP & Domain
  const safetyCheck = await verifyUrlSafety(fetchUrl);
  if (!safetyCheck.safe) {
    return NextResponse.json(
      { ok: false, code: "SECURITY_BLOCK", message: `Request blocked for security reasons: ${safetyCheck.reason}` },
      { status: 403 }
    );
  }

  let text: string;
  let httpStatus: number;
  let contentType: string;

  try {
    const resp = await fetch(fetchUrl, {
      headers: { Accept: "text/plain,text/csv,application/octet-stream,*/*" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    httpStatus = resp.status;
    contentType = resp.headers.get("content-type") ?? "";
    text = await readStreamSafely(resp);

    if (!resp.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "FETCH_ERROR",
          message: `Server returned HTTP ${httpStatus} for this URL. The file may not exist, or the URL may be wrong. Check the path and try again.`,
        },
        { status: 502 }
      );
    }
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        code: "FETCH_ERROR",
        message: `Failed to fetch measurement file: ${e instanceof Error ? e.message : "Network error"}`,
      },
      { status: 502 }
    );
  }

  // Fast-fail on HTML content-type
  if (contentType.includes("text/html")) {
    return NextResponse.json(
      { ok: false, code: "HTML_RESPONSE", message: PARSER_ERROR_MESSAGES.HTML_RESPONSE },
      { status: 422 }
    );
  }

  const parsed2 = parseMeasurementTextMultiChannel(text, { channelMode });
  if (!parsed2.ok) {
    return NextResponse.json(
      { ok: false, code: parsed2.code, message: parsed2.message },
      { status: 422 }
    );
  }

  const baseLabel = sourceLabel(parsed);
  return NextResponse.json({
    ok: true,
    mode: "fr-data",
    source: parsed,
    curves: parsed2.curves.map((c: MultiChannelParsedCurve) => ({
      label: `${baseLabel}${c.labelSuffix}`,
      channel: c.channel,
      pointCount: c.points.length,
      normalized: c.normalized,
      ...(c.rawChannels ? { rawChannels: c.rawChannels } : {}),
    })),
  });
}
