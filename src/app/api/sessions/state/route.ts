import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, mysteryId, state } = body;

    if (!teamId || !mysteryId || state === undefined) {
      return NextResponse.json(
        { error: "teamId, mysteryId, and state are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("id")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .in("status", ["not_started", "in_progress"])
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("game_sessions")
      .update({ state, last_saved_at: new Date().toISOString() })
      .eq("id", session.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Session state API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
