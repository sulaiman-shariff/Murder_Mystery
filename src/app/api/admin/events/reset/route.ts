import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/database/admin-audit";

/**
 * Wipes ONE event. The old global "clear" deleted every team and session across
 * every event from an unparameterised POST — this is the scoped replacement.
 *
 * scope "sessions" keeps the teams and their PINs, which is the common case:
 * a dry run before the real thing, without making forty people re-register.
 */
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { eventId, scope, confirm } = await request.json().catch(() => ({}));

  if (!eventId || (scope !== "sessions" && scope !== "everything")) {
    return NextResponse.json(
      { error: "eventId and a scope of 'sessions' or 'everything' are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, event_code")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Verified server-side, independent of the UI.
  if (confirm !== event.event_code) {
    return NextResponse.json(
      { error: "Type the join code exactly to confirm." },
      { status: 400 }
    );
  }

  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("id")
    .eq("event_id", eventId);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  // AI logs first: ai_interactions.session_id is ON DELETE SET NULL, so
  // deleting sessions would orphan them rather than remove them, and every
  // reset would quietly accumulate un-attributable logs forever.
  let aiDeleted = 0;
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from("ai_interactions")
      .delete({ count: "exact" })
      .in("session_id", sessionIds);
    aiDeleted = count ?? 0;
  }

  await supabase.from("game_sessions").delete().eq("event_id", eventId);

  let teamsDeleted = 0;
  if (scope === "everything") {
    const { count } = await supabase
      .from("teams")
      .delete({ count: "exact" })
      .eq("event_id", eventId);
    teamsDeleted = count ?? 0;
  }

  logAdminAction(supabase, {
    action: "event.reset",
    eventId,
    detail: { scope, sessions: sessionIds.length, teams: teamsDeleted },
  });

  return NextResponse.json({
    success: true,
    deleted: {
      sessions: sessionIds.length,
      teams: teamsDeleted,
      aiInteractions: aiDeleted,
    },
  });
}
