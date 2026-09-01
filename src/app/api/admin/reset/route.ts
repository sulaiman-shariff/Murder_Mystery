import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/database/admin-audit";
import { getMysteryById } from "@/data/mystery-index";

/**
 * Reset one case for every team in an event — for when a case turns out to be
 * broken or unfair partway through and everyone needs a clean run at it.
 *
 * eventId is now REQUIRED. It used to be optional, and omitting it reset that
 * case across every event in the database.
 */
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { mysteryId, eventId } = await request.json().catch(() => ({}));

  if (!mysteryId || !getMysteryById(mysteryId)) {
    return NextResponse.json({ error: "A valid case is required" }, { status: 400 });
  }
  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required — a reset is always scoped to one event" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // .update() reports count: null unless asked, so the old resetCount was
  // always null. Select the rows back and count them.
  const { data, error } = await supabase
    .from("game_sessions")
    .update({
      status: "not_started",
      wrong_attempts: 0,
      hints_used: 0,
      score: 0,
      elapsed_seconds: 0,
      state: {},
      state_rev: 0,
      completed_at: null,
      last_saved_at: new Date().toISOString(),
    })
    .eq("mystery_id", mysteryId)
    .eq("event_id", eventId)
    .in("status", ["in_progress", "completed", "failed"])
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Could not reset that case" }, { status: 500 });
  }

  logAdminAction(supabase, {
    action: "case.reset",
    eventId,
    detail: { mysteryId, resetCount: data?.length ?? 0 },
  });

  return NextResponse.json({ success: true, resetCount: data?.length ?? 0 });
}
