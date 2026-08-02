import { NextRequest, NextResponse } from "next/server";
import { parseSourceUrl, sourceLabel } from "@/lib/parseSourceUrl";
import { parseMeasurementText, parseMeasurementTextMultiChannel, type MultiChannelParsedCurve } from "@/lib/parseMeasurementFile";
import { resolveSquigUrls } from "@/lib/resolveSquigUrl";
import { verifyUrlSafety } from "@/lib/security";
import type { ImportResult, CurveData } from "@/types/audio";

// In-memory rate limiting store (clears dynamically or on serverless cold starts)
const RATE_LIMIT_MAP = new Map<string, { count: number; timestamp: number }>();
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
        signal: AbortSignal.timeout(12000),
      });
      if (resp.ok && !(resp.headers.get("content-type") ?? "").includes("text/html")) {
        const text = await readStreamSafely(resp);
        if (text && text.trim().length > 0) {
          return { text, url: u };
        }
      }
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse<ImportResult>> {
  // 1. Rate Limiting Check
  const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown";
  if (ip !== "unknown") {
    const now = Date.now();
    const record = RATE_LIMIT_MAP.get(ip);
    if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
      RATE_LIMIT_MAP.set(ip, { count: 1, timestamp: now });
    } else {
      if (record.count >= MAX_REQUESTS) {
        return NextResponse.json(
          { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please wait a minute before trying again." },
          { status: 429 }
        );
      }
      record.count += 1;
    }
  }

  const body = await req.json();
  const url = typeof body.url === "string" ? body.url : "";
  const channelMode = body.channelMode === "separate" ? "separate" : "avg";

  // 2. Input Validation
  if (url.length > 1000) {
    return NextResponse.json(
      { ok: false, code: "INVALID_URL", message: "URL exceeds maximum allowed length (1000 characters)." },
      { status: 400 }
    );
  }

  const parsed = parseSourceUrl(url);

  // ── Auto-Resolution (Squiglink & Hangout) ─────────────────────────────────
  if (parsed.kind === "squiglink-share-url" || parsed.kind === "hangout-graph-url") {
    const baseUrl = parsed.baseUrl;
    if (parsed.models.length > 0) {
      try {
        const resolved = await resolveSquigUrls(
          baseUrl,
          parsed.models.map((m) => m.raw)
        );

        if (resolved.length > 0) {
          const curves: CurveData[] = [];
          
          for (const entry of resolved) {
            let leftCurve: CurveData | null = null;
            let rightCurve: CurveData | null = null;

            const leftUrls = entry.leftUrls ?? [entry.leftUrl];
            const rightUrls = entry.rightUrls ?? [entry.rightUrl];
            const fallbackUrls = entry.fallbackUrls ?? [entry.fallbackUrl];

            // Fetch Left Channel
            const resL = await fetchFirstValidStream(leftUrls);
            if (resL) {
              const pL = parseMeasurementText(resL.text);
              if (pL.ok) {
                leftCurve = {
                  label: `${entry.label} (L)`,
                  channel: "L",
                  points: pL.points,
                  normalized: pL.normalized,
                };
              }
            }

            // Fetch Right Channel
            const resR = await fetchFirstValidStream(rightUrls);
            if (resR) {
              const pR = parseMeasurementText(resR.text);
              if (pR.ok) {
                rightCurve = {
                  label: `${entry.label} (R)`,
                  channel: "R",
                  points: pR.points,
                  normalized: pR.normalized,
                };
              }
            }

            // If both L and R succeeded
            if (leftCurve && rightCurve) {
              const rawChannels = { left: leftCurve.normalized, right: rightCurve.normalized };
              if (channelMode === "separate") {
                curves.push({ ...leftCurve, rawChannels });
                curves.push({ ...rightCurve, rawChannels });
              } else {
                const hz = leftCurve.normalized.hz;
                const db = hz.map((_, i) => (leftCurve!.normalized.db[i] + rightCurve!.normalized.db[i]) / 2);
                curves.push({
                  label: entry.label,
                  channel: "avg",
                  points: leftCurve.points,
                  normalized: { hz, db },
                  rawChannels,
                });
              }
            } else if (leftCurve) {
              curves.push({ ...leftCurve, label: entry.label, channel: "avg" });
            } else if (rightCurve) {
              curves.push({ ...rightCurve, label: entry.label, channel: "avg" });
            } else {
              // Fallback to bare .txt file
              const resFb = await fetchFirstValidStream(fallbackUrls);
              if (resFb) {
                const pFb = parseMeasurementText(resFb.text);
                if (pFb.ok) {
                  curves.push({
                    label: entry.label,
                    channel: "avg",
                    points: pFb.points,
                    normalized: pFb.normalized,
                  });
                }
              }
            }
          }
          
          if (curves.length > 0) {
            const result: ImportResult = {
              ok: true,
              mode: "fr-data",
              source: parsed,
              curves,
            };
            return NextResponse.json(result);
          }
        }
      } catch (resolveErr) {
        void resolveErr;
      }
    }

    // Fallback: return metadata-only with helpful message
    const result: ImportResult = {
      ok: true,
      mode: "metadata-only",
      source: parsed,
      curves: [],
      label: sourceLabel(parsed),
      message: `Graph URL detected. Models: ${
        parsed.models.map((m) => m.label).join(", ") || "(none)"
      }. Could not automatically resolve measurement data — the model may not be in this site's phone book, or the host blocked the request. Try pasting a direct .txt URL instead.`,
    };
    return NextResponse.json(result);
  }

  // ── Unsupported URL ───────────────────────────────────────────────────────
  if (parsed.kind === "unsupported-url") {
    const result: ImportResult = {
      ok: false,
      code: "UNSUPPORTED_URL",
      message: parsed.reason,
    };
    return NextResponse.json(result, { status: 400 });
  }

  // ── Raw measurement file: fetch and parse ─────────────────────────────────
  // Encode any unencoded spaces in the path
  const fetchUrl = parsed.url.replace(/ /g, "%20");

  // SSRF Mitigation: Validate IP & Domain
  const safetyCheck = await verifyUrlSafety(fetchUrl);
  if (!safetyCheck.safe) {
    const result: ImportResult = {
      ok: false,
      code: "SECURITY_BLOCK",
      message: `Request blocked for security reasons: ${safetyCheck.reason}`,
    };
    return NextResponse.json(result, { status: 403 });
  }

  let text: string;
  let httpStatus: number;
  let contentType: string;

  try {
    const resp = await fetch(fetchUrl, {
      headers: { Accept: "text/plain,text/csv,application/octet-stream,*/*" },
      signal: AbortSignal.timeout(15000),
    });
    httpStatus = resp.status;
    contentType = resp.headers.get("content-type") ?? "";
    text = await readStreamSafely(resp);

    if (!resp.ok) {
      const result: ImportResult = {
        ok: false,
        code: "FETCH_ERROR",
        message: `Server returned HTTP ${httpStatus} for this URL. The file may not exist, or the URL may be wrong. Check the path and try again.`,
      };
      return NextResponse.json(result, { status: 502 });
    }
  } catch (e: unknown) {
    const result: ImportResult = {
      ok: false,
      code: "FETCH_ERROR",
      message: `Failed to fetch measurement file: ${e instanceof Error ? e.message : "Network error"}`,
    };
    return NextResponse.json(result, { status: 502 });
  }

  // Fast-fail on HTML content-type
  if (contentType.includes("text/html")) {
    const result: ImportResult = {
      ok: false,
      code: "HTML_RESPONSE",
      message:
        "The URL returned an HTML page, not a measurement file. The URL may point to a graph viewer or a page that requires login.",
    };
    return NextResponse.json(result, { status: 422 });
  }

  const parsed2 = parseMeasurementTextMultiChannel(text, { channelMode });
  if (!parsed2.ok) {
    const result: ImportResult = {
      ok: false,
      code: parsed2.code,
      message: parsed2.message,
    };
    return NextResponse.json(result, { status: 422 });
  }

  const baseLabel = sourceLabel(parsed);
  const result: ImportResult = {
    ok: true,
    mode: "fr-data",
    source: parsed,
    curves: parsed2.curves.map((c: MultiChannelParsedCurve) => ({
      label: `${baseLabel}${c.labelSuffix}`,
      channel: c.channel,
      points: c.points,
      normalized: c.normalized,
    })),
  };
  return NextResponse.json(result);
}
