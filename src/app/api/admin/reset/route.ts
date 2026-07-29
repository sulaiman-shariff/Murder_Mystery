import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  try {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { mysteryId, eventId } = body;

    if (!mysteryId) {
      return NextResponse.json(
        { error: "mysteryId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const query = supabase
      .from("game_sessions")
      .update({
        status: "not_started",
        wrong_attempts: 0,
        hints_used: 0,
        score: 0,
        state: {},
        completed_at: null,
        last_saved_at: new Date().toISOString(),
      })
      .eq("mystery_id", mysteryId)
      .in("status", ["in_progress", "completed", "failed"]);

    if (eventId) {
      query.eq("event_id", eventId);
    }

    const { error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, resetCount: count });
  } catch (err) {
    console.error("Admin reset API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
