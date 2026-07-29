import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    model: process.env.AI_MODEL || "gemini-2.5-flash-lite",
    hasAiKey: !!process.env.AI_API_KEY,
  });
}
