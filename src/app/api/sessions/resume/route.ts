import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get("teamId");
    const mysteryId = request.nextUrl.searchParams.get("mysteryId");

    if (!teamId || !mysteryId) {
      return NextResponse.json(
        { error: "teamId and mysteryId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("id, state, startedAt:started_at, wrongAttempts:wrong_attempts, hintsUsed:hints_used, score, status")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .in("status", ["not_started", "in_progress"])
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("Session resume error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
