import { createClient } from "@/lib/supabase/server";

const STALE_HOURS = 24;

export async function cleanupStaleSessions(teamId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("game_sessions")
      .update({
        status: "failed",
        last_saved_at: new Date().toISOString(),
      })
      .eq("team_id", teamId)
      .eq("status", "in_progress")
      .lt("last_saved_at", cutoff)
      .select("id");

    if (error) {
      console.error("Stale session cleanup error:", error.message);
      return 0;
    }

    if (data && data.length > 0) {
      console.log(`Cleaned up ${data.length} stale sessions for team ${teamId}`);
    }

    return data?.length || 0;
  } catch {
    return 0;
  }
}
