import { createAdminClient } from "@/lib/supabase/server-admin";
import type { GameSession } from "@/types";

const SELECT_COLUMNS = "id, eventId:event_id, teamId:team_id, mysteryId:mystery_id, status, startedAt:started_at, completedAt:completed_at, wrongAttempts:wrong_attempts, hintsUsed:hints_used, score, elapsedSeconds:elapsed_seconds, state, lastSavedAt:last_saved_at";

export async function createSession(
  teamId: string,
  eventId: string,
  mysteryId: string
): Promise<GameSession> {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  const { data: session, error } = await supabase
    .from("game_sessions")
    .insert({
      event_id: eventId,
      team_id: teamId,
      mystery_id: mysteryId,
      status: "in_progress",
      started_at: now,
      last_saved_at: now,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return session;
}

export async function getActiveSession(
  teamId: string,
  eventId: string
): Promise<GameSession | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("game_sessions")
    .select(SELECT_COLUMNS)
    .eq("team_id", teamId)
    .eq("event_id", eventId)
    .in("status", ["not_started", "in_progress"])
    .order("last_saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getSession(
  sessionId: string
): Promise<GameSession | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("game_sessions")
    .select(SELECT_COLUMNS)
    .eq("id", sessionId)
    .single();

  return data;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<GameSession>
): Promise<void> {
  const supabase = createAdminClient();

  const dbUpdates: Record<string, unknown> = { last_saved_at: new Date().toISOString() };
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.wrongAttempts !== undefined) dbUpdates.wrong_attempts = updates.wrongAttempts;
  if (updates.hintsUsed !== undefined) dbUpdates.hints_used = updates.hintsUsed;
  if (updates.score !== undefined) dbUpdates.score = updates.score;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
  if (updates.state !== undefined) dbUpdates.state = updates.state;
  if (updates.elapsedSeconds !== undefined) dbUpdates.elapsed_seconds = updates.elapsedSeconds;

  const { error } = await supabase
    .from("game_sessions")
    .update(dbUpdates)
    .eq("id", sessionId);

  if (error) throw error;
}

export async function getTeamHistory(
  teamId: string,
  eventId: string
): Promise<GameSession[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("game_sessions")
    .select(SELECT_COLUMNS)
    .eq("team_id", teamId)
    .eq("event_id", eventId)
    .order("started_at", { ascending: true });

  return data || [];
}

export async function resetSession(sessionId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("game_sessions")
    .update({
      status: "not_started",
      wrong_attempts: 0,
      hints_used: 0,
      score: 0,
      elapsed_seconds: 0,
      state: {},
      completed_at: null,
    })
    .eq("id", sessionId);

  if (error) throw error;
}
