import { createAdminClient } from "@/lib/supabase/server-admin";
import { migrateState, type SessionState } from "@/lib/game/session-state";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface LoadedSession {
  id: string;
  eventId: string;
  status: string;
  startedAt: string | null;
  state: SessionState;
  rev: number;
}

export async function loadSession(
  supabase: AdminClient,
  teamId: string,
  mysteryId: string,
  statuses: string[] = ["not_started", "in_progress"]
): Promise<LoadedSession | null> {
  const { data } = await supabase
    .from("game_sessions")
    .select("id, event_id, status, started_at, state, state_rev")
    .eq("team_id", teamId)
    .eq("mystery_id", mysteryId)
    .in("status", statuses)
    .order("last_saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    eventId: data.event_id,
    status: data.status,
    startedAt: data.started_at,
    state: migrateState(data.state),
    rev: data.state_rev ?? 0,
  };
}

/**
 * Applies a change under optimistic concurrency.
 *
 * `mutate` receives the revision it is writing at, so client ops can stamp
 * their cells with a server-assigned ordering rather than a phone clock. It
 * may be called more than once: if another device wrote first the update
 * matches no rows and we reapply against the newer document instead of
 * clobbering it. This is what makes the alibi and interrogation budgets
 * actually hold when four phones act at once.
 */
export async function updateSessionState(
  supabase: AdminClient,
  session: LoadedSession,
  mutate: (state: SessionState, revision: number) => SessionState,
  extraColumns: Record<string, unknown> = {},
  attempt = 0
): Promise<{ state: SessionState; rev: number }> {
  const nextRev = session.rev + 1;
  const next = mutate(session.state, nextRev);

  const { data } = await supabase
    .from("game_sessions")
    .update({
      state: next,
      state_rev: nextRev,
      last_saved_at: new Date().toISOString(),
      ...extraColumns,
    })
    .eq("id", session.id)
    .eq("state_rev", session.rev)
    .select("id");

  if (data && data.length > 0) return { state: next, rev: nextRev };

  if (attempt >= 3) {
    throw new Error("Could not save — too many concurrent updates");
  }

  const { data: fresh } = await supabase
    .from("game_sessions")
    .select("id, event_id, status, started_at, state, state_rev")
    .eq("id", session.id)
    .maybeSingle();

  if (!fresh) throw new Error("Session disappeared");

  return updateSessionState(
    supabase,
    {
      id: fresh.id,
      eventId: fresh.event_id,
      status: fresh.status,
      startedAt: fresh.started_at,
      state: migrateState(fresh.state),
      rev: fresh.state_rev ?? 0,
    },
    mutate,
    extraColumns,
    attempt + 1
  );
}
