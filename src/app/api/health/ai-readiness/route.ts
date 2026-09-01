import { NextResponse } from "next/server";
import { checkAiReadiness } from "@/lib/ai/readiness";

export async function GET() {
  const readiness = await checkAiReadiness();
  return NextResponse.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
  });
}
