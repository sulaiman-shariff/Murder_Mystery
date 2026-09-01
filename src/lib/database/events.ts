import { createAdminClient } from "@/lib/supabase/server-admin";
import { DEFAULT_SCORING } from "@/lib/game/scoring";
import type { ScoringSettings } from "@/types";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Resolves a human-facing event code (what teams type in) to the row id that
 * every other table foreign-keys against. Used by the team, leaderboard and
 * admin paths, which all take a code from the client but query by id.
 */
export async function getEventIdByCode(
  supabase: AdminClient,
  eventCode: string
): Promise<string | null> {
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("event_code", eventCode)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * The scoring rules for an event, with any values the admin has not set
 * falling back to the defaults. Stored settings may be partial, so they are
 * merged rather than used as-is.
 */
export async function getEventScoring(
  supabase: AdminClient,
  eventId: string
): Promise<ScoringSettings> {
  const { data } = await supabase
    .from("events")
    .select("scoring_settings")
    .eq("id", eventId)
    .maybeSingle();

  const stored = data?.scoring_settings as Partial<ScoringSettings> | null;
  return { ...DEFAULT_SCORING, ...(stored ?? {}) };
}
