import { createAdminClient } from "@/lib/supabase/server-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Records an admin action. Fire-and-forget: an audit write must never be the
 * reason a rescue fails.
 */
export function logAdminAction(
  supabase: AdminClient,
  entry: {
    action: string;
    eventId?: string | null;
    teamId?: string | null;
    detail?: Record<string, unknown>;
  }
) {
  void supabase
    .from("admin_actions")
    .insert({
      action: entry.action,
      event_id: entry.eventId ?? null,
      team_id: entry.teamId ?? null,
      detail: entry.detail ?? {},
    })
    .then(({ error }) => {
      if (error) console.error("admin audit write failed:", error.message);
    });
}
