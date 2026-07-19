import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const data = await redis.get(`workspace:${id}`);
    if (!data) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Upstash SDK automatically parses JSON objects if the value is JSON.
    // If it's a string, we might need to parse it, but if it comes back as an object, we use it directly.
    const workspace = typeof data === 'string' ? JSON.parse(data) : data;

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Failed to fetch workspace:", error);
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
  }
}
