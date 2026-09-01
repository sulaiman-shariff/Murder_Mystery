import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/database/leaderboard";
import { getEventIdByCode } from "@/lib/database/events";
import { createAdminClient } from "@/lib/supabase/server-admin";

export async function GET(request: NextRequest) {
  const eventCode = request.nextUrl.searchParams.get("eventCode");

  if (!eventCode) {
    return NextResponse.json(
      { error: "eventCode is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const eventId = await getEventIdByCode(supabase, eventCode);

    if (!eventId) {
      return NextResponse.json(
        { error: "That event code does not match an event." },
        { status: 404 }
      );
    }

    const leaderboard = await getLeaderboard(eventId);

    return NextResponse.json({
      leaderboard,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("leaderboard error:", err);
    return NextResponse.json(
      { error: "Could not load the leaderboard." },
      { status: 500 }
    );
  }
}
