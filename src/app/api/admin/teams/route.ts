import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { getEventIdByCode } from "@/lib/database/events";

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const eventCode = request.nextUrl.searchParams.get("eventCode") ||
    request.nextUrl.searchParams.get("eventId");

  if (!eventCode) {
    return NextResponse.json({ error: "eventCode is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const eventId = await getEventIdByCode(supabase, eventCode);

  if (!eventId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // PINs are stripped from the response unless explicitly asked for. They
  // used to be in every payload, including ones that auto-refresh on a laptop
  // in a room full of players.
  const includePins = request.nextUrl.searchParams.get("includePins") === "1";

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, pin, eventId:event_id, createdAt:created_at, lastActiveAt:last_active_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!teams || teams.length === 0) {
    return NextResponse.json({ teams: [] });
  }

  const teamIds = teams.map((t) => t.id);

  const { data: sessions } = await supabase
    .from("game_sessions")
    .select("team_id, mystery_id, status, wrong_attempts, hints_used, score, elapsed_seconds, started_at, completed_at, last_saved_at")
    .in("team_id", teamIds)
    .order("mystery_id", { ascending: true });

  const sessionsByTeam = new Map<string, typeof sessions>();
  if (sessions) {
    for (const s of sessions) {
      const list = sessionsByTeam.get(s.team_id) || [];
      list.push(s);
      sessionsByTeam.set(s.team_id, list);
    }
  }

  const teamsWithSessions = teams.map((team) => ({
    id: team.id,
    name: team.name,
    pin: includePins ? team.pin : undefined,
    eventId: team.eventId,
    createdAt: team.createdAt,
    lastActiveAt: team.lastActiveAt,
    sessions: (sessionsByTeam.get(team.id) || []).map((s) => ({
      mysteryId: s.mystery_id,
      status: s.status,
      wrongAttempts: s.wrong_attempts,
      hintsUsed: s.hints_used,
      score: s.score,
      elapsedSeconds: s.elapsed_seconds,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      lastSavedAt: s.last_saved_at,
    })),
  }));

  return NextResponse.json({ teams: teamsWithSessions, total: teamsWithSessions.length });
}
