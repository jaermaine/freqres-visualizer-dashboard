import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  try {
    const base64Data = await redis.get<string>(`workspace_image:${id}`);
    if (!base64Data) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error("Failed to fetch OG image:", error);
    return new NextResponse("Failed to fetch image", { status: 500 });
  }
}
