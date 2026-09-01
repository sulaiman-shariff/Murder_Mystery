import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";

/** Counts behind a destructive action, so the confirm sheet can state magnitude. */
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createAdminClient();

  const [{ count: teams }, { data: sessions }] = await Promise.all([
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id),
    supabase.from("game_sessions").select("id").eq("event_id", id),
  ]);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  let aiInteractions = 0;
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from("ai_interactions")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds);
    aiInteractions = count ?? 0;
  }

  return NextResponse.json(
    { teams: teams ?? 0, sessions: sessionIds.length, aiInteractions },
    { headers: { "Cache-Control": "no-store" } }
  );
}
