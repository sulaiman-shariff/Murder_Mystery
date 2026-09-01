import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireTeam } from "@/lib/auth/team-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById } from "@/data/mystery-index";

/** Roughly 64 KB of JSON. A working theory is nowhere near this. */
const MAX_STATE_BYTES = 64_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mysteryId, state } = body;

    // Identity comes from the signed cookie, never the body: this route used
    // to accept whatever teamId it was handed, so any caller could overwrite
    // another team's game state.
    const actor = requireTeam(request, body.teamId);
    if (actor instanceof NextResponse) return actor;
    const teamId = actor.teamId;

    const limitCheck = checkRateLimit(`state:${teamId}`);
    if (limitCheck) return limitCheck;

    if (!mysteryId || state === undefined) {
      return NextResponse.json(
        { error: "mysteryId and state are required" },
        { status: 400 }
      );
    }

    if (!getMysteryById(mysteryId)) {
      return NextResponse.json({ error: "Unknown mystery" }, { status: 400 });
    }

    if (JSON.stringify(state).length > MAX_STATE_BYTES) {
      return NextResponse.json(
        { error: "That is more state than a case should need." },
        { status: 413 }
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
