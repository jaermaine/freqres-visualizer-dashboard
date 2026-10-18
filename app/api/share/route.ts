import { NextRequest, NextResponse } from "next/server";
import { redis, isRedisConfigured } from "@/lib/redis";
import { extractClientIp, checkInMemoryRateLimit } from "@/lib/security";

const SHARE_RATE_LIMIT = 10; // Max 10 shares per IP per minute
const SHARE_WINDOW_SEC = 60;
const MAX_BODY_CHARS = 1_500_000; // ~1.5 MB max payload
const MAX_IMAGE_CHARS = 1_000_000; // ~750 KB binary JPEG max
const WORKSPACE_TTL_SEC = 259200; // 3 days

function generateShortId(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    if (!isRedisConfigured) {
      return NextResponse.json({ error: "Sharing service is not configured" }, { status: 503 });
    }

    // 1. Payload Size Guard
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // 2. Hybrid Rate Limiting (Fast in-memory check + distributed Redis counter)
    const ip = extractClientIp(req.headers, req.ip);
    if (!checkInMemoryRateLimit(`share:${ip}`, SHARE_RATE_LIMIT, SHARE_WINDOW_SEC * 1000)) {
      return NextResponse.json({ error: "Too many share requests. Please wait a minute." }, { status: 429 });
    }

    if (ip !== "unknown") {
      const rlKey = `ratelimit:share:${ip}`;
      const count = await redis.incr(rlKey);
      if (count === 1) {
        await redis.expire(rlKey, SHARE_WINDOW_SEC);
      }
      if (count > SHARE_RATE_LIMIT) {
        return NextResponse.json({ error: "Too many share requests. Please wait a minute." }, { status: 429 });
      }
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (
      !body ||
      !Array.isArray(body.urls) ||
      body.urls.length === 0 ||
      body.urls.length > 20 ||
      !body.urls.every((u) => typeof u === "string" && u.length > 0 && u.length <= 1000)
    ) {
      return NextResponse.json({ error: "Invalid urls array in payload" }, { status: 400 });
    }

    const workspaceData = {
      urls: body.urls,
      target: typeof body.target === "string" ? body.target.slice(0, 64) : "none",
      bands: Array.isArray(body.bands)
        ? body.bands.filter((b): b is string => typeof b === "string" && b.length <= 64).slice(0, 30)
        : [],
      compensated: Boolean(body.compensated),
      interactive: body.interactive !== undefined ? Boolean(body.interactive) : true,
    };

    let base64Data: string | null = null;
    if (typeof body.image === "string" && body.image.length > 0) {
      if (body.image.length > MAX_IMAGE_CHARS) {
        return NextResponse.json({ error: "Snapshot image exceeds size limit" }, { status: 413 });
      }
      base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
    }

    // 3. Atomic ID reservation via SET NX EX (avoids separate exists + set round-trips)
    let shortId = generateShortId();
    let reserved = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await redis.set(`workspace:${shortId}`, JSON.stringify(workspaceData), {
        nx: true,
        ex: WORKSPACE_TTL_SEC,
      });
      if (res === "OK") {
        reserved = true;
        break;
      }
      shortId = generateShortId();
    }

    if (!reserved) {
      return NextResponse.json({ error: "Could not allocate shortlink ID" }, { status: 500 });
    }

    // Save snapshot image if provided
    if (base64Data) {
      await redis.set(`workspace_image:${shortId}`, base64Data, { ex: WORKSPACE_TTL_SEC });
    }

    return NextResponse.json({ id: shortId });
  } catch (error) {
    console.error("Failed to share workspace:", error);
    return NextResponse.json({ error: "Failed to share workspace" }, { status: 500 });
  }
}
