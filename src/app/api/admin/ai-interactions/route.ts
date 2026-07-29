import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const teamId = request.nextUrl.searchParams.get("teamId");
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const type = request.nextUrl.searchParams.get("type");
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 200);

  const supabase = createAdminClient();

  let query = supabase
    .from("ai_interactions")
    .select(`
      id,
      session_id,
      type,
      player_input,
      ai_output,
      created_at,
      session:game_sessions!inner(team_id)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data: interactions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered = teamId
    ? (interactions || []).filter((i) => {
        const s = i.session as Record<string, unknown> | Record<string, unknown>[];
        const t = Array.isArray(s) ? s[0] : s;
        return t?.team_id === teamId;
      })
    : (interactions || []);

  return NextResponse.json({ interactions: filtered });
}
