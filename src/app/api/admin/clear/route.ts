import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const supabase = createAdminClient();

    const { error: sessionsErr } = await supabase
      .from("ai_interactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (sessionsErr) {
      return NextResponse.json({ error: sessionsErr.message }, { status: 500 });
    }

    const { error: teamsErr } = await supabase
      .from("game_sessions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (teamsErr) {
      return NextResponse.json({ error: teamsErr.message }, { status: 500 });
    }

    const { error: aiErr } = await supabase
      .from("teams")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (aiErr) {
      return NextResponse.json({ error: aiErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin clear API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
