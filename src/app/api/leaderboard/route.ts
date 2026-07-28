import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/database/leaderboard";

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const leaderboard = await getLeaderboard(eventId);

  return NextResponse.json({
    leaderboard,
    lastUpdated: new Date().toISOString(),
  });
}
