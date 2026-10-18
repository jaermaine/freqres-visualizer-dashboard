import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const VALID_ID_RE = /^[a-zA-Z0-9]{4,12}$/;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !VALID_ID_RE.test(id)) {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }

  try {
    const data = await redis.get(`workspace:${id}`);
    if (!data) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const workspace = typeof data === "string" ? JSON.parse(data) : data;
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Failed to fetch workspace:", error);
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
  }
}
