import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { getEventScoring } from "@/lib/database/events";
import { getProofSpec } from "@/data/deduction";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, eventId, mysteryId } = body;

    if (!teamId || !eventId || !mysteryId) {
      return NextResponse.json(
        { error: "teamId, eventId, and mysteryId are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: event } = await supabase
      .from("events")
      .select("max_attempts")
      .eq("id", eventId)
      .single();

    const maxAttempts = event?.max_attempts || 10;
    // Sent to the client so the solve panel can preview a score using the
    // same rules the server will apply on completion.
    const scoring = await getEventScoring(supabase, eventId);
    // The cap on a proof submission. Safe to expose — it is a limit, not a key.
    const maxSelections = getProofSpec(mysteryId)?.maxSelections ?? 5;

    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("game_sessions")
      .select("id, status, started_at, wrong_attempts, hints_used, state, elapsed_seconds")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .in("status", ["not_started", "in_progress"])
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: updated } = await supabase
        .from("game_sessions")
        .update({
          status: existing.status === "not_started" ? "in_progress" : existing.status,
          started_at: existing.status === "not_started" ? now : existing.started_at || now,
          last_saved_at: now,
        })
        .eq("id", existing.id)
        .select("id, event_id, team_id, mystery_id, status, started_at, completed_at, wrong_attempts, hints_used, score, state, elapsed_seconds, last_saved_at")
        .single();

      if (updated) {
        return NextResponse.json({ session: sessionRowToResponse(updated), maxAttempts, scoring, maxSelections });
      }
    }

    const { data: newSession, error } = await supabase
      .from("game_sessions")
      .insert({
        event_id: eventId,
        team_id: teamId,
        mystery_id: mysteryId,
        status: "in_progress",
        started_at: now,
        last_saved_at: now,
      })
      .select("id, event_id, team_id, mystery_id, status, started_at, completed_at, wrong_attempts, hints_used, score, state, elapsed_seconds, last_saved_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ session: sessionRowToResponse(newSession), maxAttempts, scoring, maxSelections });
  } catch (err) {
    console.error("Session start error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

function sessionRowToResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    eventId: row.event_id,
    teamId: row.team_id,
    mysteryId: row.mystery_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    wrongAttempts: row.wrong_attempts,
    hintsUsed: row.hints_used,
    score: row.score,
    state: row.state,
    elapsedSeconds: row.elapsed_seconds,
    lastSavedAt: row.last_saved_at,
  };
}
