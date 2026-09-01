import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/database/admin-audit";
import { getMysteryById } from "@/data/mystery-index";

/**
 * Rescue a team mid-event.
 *
 * The important property is what this route does NOT do: it never touches
 * `state`. Until now the only remedy for a team locked out by exhausted
 * attempts was a reset that blanked their notes and their board along with the
 * counter — an hour of work destroyed to undo a bad guess.
 */
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const {
    teamId,
    mysteryId,
    grantAttempts,
    setWrongAttempts,
    setHintsUsed,
    setScore,
    unfail,
    reopen,
    reason,
  } = body;

  if (!teamId || !mysteryId || !getMysteryById(mysteryId)) {
    return NextResponse.json(
      { error: "A team and a valid case are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, status, started_at, wrong_attempts, hints_used, score")
    .eq("team_id", teamId)
    .eq("mystery_id", mysteryId)
    .order("last_saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "No session for that team and case" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    last_saved_at: new Date().toISOString(),
  };

  if (typeof grantAttempts === "number") {
    updates.wrong_attempts = Math.max(
      0,
      (session.wrong_attempts ?? 0) - Math.floor(grantAttempts)
    );
  }
  if (typeof setWrongAttempts === "number") {
    updates.wrong_attempts = Math.max(0, Math.floor(setWrongAttempts));
  }
  if (typeof setHintsUsed === "number") {
    updates.hints_used = Math.max(0, Math.floor(setHintsUsed));
  }
  if (typeof setScore === "number") {
    updates.score = Math.min(10_000, Math.max(0, Math.floor(setScore)));
  }

  if (unfail || reopen) {
    updates.status = "in_progress";
    updates.completed_at = null;
    // Scoring derives elapsed time from started_at and falls back to zero when
    // it is null, so reopening a session without one would hand the team a
    // perfect time bonus.
    if (!session.started_at) updates.started_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("game_sessions")
    .update(updates)
    .eq("id", session.id)
    .select("id, status, wrong_attempts, hints_used, score, started_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not adjust that session" }, { status: 500 });
  }

  logAdminAction(supabase, {
    action: "session.adjust",
    teamId,
    detail: {
      mysteryId,
      from: {
        status: session.status,
        wrongAttempts: session.wrong_attempts,
        hintsUsed: session.hints_used,
        score: session.score,
      },
      changes: Object.keys(updates).filter((k) => k !== "last_saved_at"),
      reason: typeof reason === "string" ? reason.slice(0, 300) : undefined,
    },
  });

  return NextResponse.json({ session: updated });
}
