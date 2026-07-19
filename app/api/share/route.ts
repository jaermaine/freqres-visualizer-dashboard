import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

// Initialize Redis from Environment Variables
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// Wait! The Vercel upstash integration creates KV_REST_API_URL and KV_REST_API_TOKEN.
// @upstash/redis automatically looks for UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
// If the user pulled KV_REST_API_URL, we should explicitly pass them if the automatic fallback fails,
// but the docs for @vercel/kv say it uses Upstash. Since we are using @upstash/redis, we can pass them manually.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

function generateShortId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.urls) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Generate a unique ID (We can use a simple 6 char string)
    let shortId = generateShortId();
    
    // Ensure uniqueness (simple retry logic)
    let exists = await redis.exists(`workspace:${shortId}`);
    while (exists) {
      shortId = generateShortId();
      exists = await redis.exists(`workspace:${shortId}`);
    }

    // Save the workspace JSON to Redis.
    // Expiration: 3 days (259200 seconds)
    await redis.set(`workspace:${shortId}`, JSON.stringify(body), { ex: 259200 });

    return NextResponse.json({ id: shortId });
  } catch (error) {
    console.error("Failed to share workspace:", error);
    return NextResponse.json({ error: "Failed to share workspace" }, { status: 500 });
  }
}
