import { NextRequest, NextResponse } from "next/server";
import { parseSourceUrl, sourceLabel } from "@/lib/parseSourceUrl";
import { parseMeasurementText } from "@/lib/parseMeasurementFile";
import { resolveSquigUrls } from "@/lib/resolveSquigUrl";
import { verifyUrlSafety } from "@/lib/security";
import type { ImportResult } from "@/types/audio";

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
    // Attempt to auto-resolve model tokens → raw .txt URLs via phone_book.json
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
            // Try primary (channel-suffixed, e.g. " L.txt"), then fallback (bare .txt)
            const urlsToTry = [entry.rawUrl, ...(entry.fallbackUrl ? [entry.fallbackUrl] : [])];
            for (const tryUrl of urlsToTry) {
              try {
                const resp = await fetch(tryUrl, {
                  headers: { Accept: "text/plain,text/csv,*/*" },
                  signal: AbortSignal.timeout(15000),
                });

                if (!resp.ok) continue;

                const contentType = resp.headers.get("content-type") ?? "";
                if (contentType.includes("text/html")) continue;

                const text = await readStreamSafely(resp);
                const parseResult = parseMeasurementText(text);

                if (parseResult.ok) {
                  curves.push({
                    label: entry.label,
                    points: parseResult.points,
                    normalized: parseResult.normalized,
                  });
                  break; // Move to the next resolved model once this one succeeds
                }
              } catch {
                continue;
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
        // phone_book fetch failed (host down, CORS, etc.) — fall through
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

  const parsed2 = parseMeasurementText(text);
  if (!parsed2.ok) {
    const result: ImportResult = {
      ok: false,
      code: parsed2.code,
      message: parsed2.message,
    };
    return NextResponse.json(result, { status: 422 });
  }

  const result: ImportResult = {
    ok: true,
    mode: "fr-data",
    source: parsed,
    curves: [
      {
        label: sourceLabel(parsed),
        points: parsed2.points,
        normalized: parsed2.normalized,
      },
    ],
  };
  return NextResponse.json(result);
}
