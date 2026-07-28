import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Direct service-account tokens are not exposed. Use the server-side AI routes." },
    { status: 410 }
  );
}
