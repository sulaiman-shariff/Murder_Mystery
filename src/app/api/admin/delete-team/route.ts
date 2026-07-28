import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error: sessionsErr } = await supabase
      .from("game_sessions")
      .delete()
      .eq("team_id", teamId);

    if (sessionsErr) {
      return NextResponse.json({ error: sessionsErr.message }, { status: 500 });
    }

    const { error: teamsErr } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (teamsErr) {
      return NextResponse.json({ error: teamsErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
