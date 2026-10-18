import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const VALID_ID_RE = /^[a-zA-Z0-9]{4,12}$/;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !VALID_ID_RE.test(id)) {
    return new NextResponse("Missing or invalid id", { status: 400 });
  }

  try {
    const base64Data = await redis.get<string>(`workspace_image:${id}`);
    if (!base64Data) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to fetch OG image:", error);
    return new NextResponse("Failed to fetch image", { status: 500 });
  }
}
