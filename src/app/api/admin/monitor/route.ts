import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { getEventIdByCode } from "@/lib/database/events";
import { flagTeam } from "@/lib/admin/monitor";

/**
 * The live monitor feed: who is playing what, and who needs help.
 *
 * Deliberately does NOT select team PINs. /api/admin/teams returns them, which
 * is tolerable on a roster the operator opened on purpose; it is not tolerable
 * in a payload that auto-refreshes on a laptop in a room full of players.
 */
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const eventCode = request.nextUrl.searchParams.get("eventCode");
  if (!eventCode) {
    return NextResponse.json({ error: "eventCode is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const eventId = await getEventIdByCode(supabase, eventCode);
  if (!eventId) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, event_code, status, max_attempts")
    .eq("id", eventId)
    .single();

  const [{ data: teams }, { data: sessions }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, created_at, last_active_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("game_sessions")
      .select(
        "team_id, mystery_id, status, started_at, last_saved_at, wrong_attempts, hints_used, score"
      )
      .eq("event_id", eventId),
  ]);

  const now = Date.now();
  const maxAttempts = event?.max_attempts ?? 10;
  const byTeam = new Map<string, typeof sessions>();
  for (const s of sessions ?? []) {
    const list = byTeam.get(s.team_id) ?? [];
    list.push(s);
    byTeam.set(s.team_id, list);
  }

  const rows = (teams ?? []).map((team) => {
    const own = byTeam.get(team.id) ?? [];
    const live =
      own.find((s) => s.status === "in_progress") ??
      own.find((s) => s.status === "failed") ??
      own.sort((a, b) =>
        (b.last_saved_at ?? "").localeCompare(a.last_saved_at ?? "")
      )[0];

    const secondsOnCase = live?.started_at
      ? Math.floor((now - new Date(live.started_at).getTime()) / 1000)
      : 0;
    const secondsSinceActivity = live?.last_saved_at
      ? Math.floor((now - new Date(live.last_saved_at).getTime()) / 1000)
      : 0;
    const attemptsRemaining = Math.max(
      0,
      maxAttempts - (live?.wrong_attempts ?? 0)
    );

    return {
      teamId: team.id,
      teamName: team.name,
      current: live
        ? {
            mysteryId: live.mystery_id,
            status: live.status,
            secondsOnCase,
            secondsSinceActivity,
            wrongAttempts: live.wrong_attempts ?? 0,
            hintsUsed: live.hints_used ?? 0,
            attemptsRemaining,
          }
        : null,
      solved: own.filter((s) => s.status === "completed").length,
      totalScore: own.reduce((sum, s) => sum + (s.score ?? 0), 0),
      flags: flagTeam({
        status: live?.status ?? "none",
        secondsOnCase,
        secondsSinceActivity,
        wrongAttempts: live?.wrong_attempts ?? 0,
        hintsUsed: live?.hints_used ?? 0,
        attemptsRemaining,
        secondsSinceRegistered: Math.floor(
          (now - new Date(team.created_at).getTime()) / 1000
        ),
        hasAnySession: own.some((s) => s.status !== "not_started"),
      }),
    };
  });

  return NextResponse.json(
    {
      now: new Date().toISOString(),
      event: {
        id: eventId,
        name: event?.name,
        eventCode: event?.event_code,
        status: event?.status,
        maxAttempts,
      },
      teams: rows,
      counts: {
        teams: rows.length,
        playing: rows.filter((r) => r.current?.status === "in_progress").length,
        solved: rows.reduce((n, r) => n + r.solved, 0),
        lockedOut: rows.filter((r) => r.flags.includes("locked-out")).length,
        needHelp: rows.filter((r) => r.flags.length > 0).length,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
