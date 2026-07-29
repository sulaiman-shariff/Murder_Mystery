import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import type { LeaderboardEntry } from "@/types";

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const eventCode = request.nextUrl.searchParams.get("eventCode");
  const format = request.nextUrl.searchParams.get("format");

  if (!eventCode) {
    return NextResponse.json({ error: "eventCode is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("event_code", eventCode)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: sessions } = await supabase
    .from("game_sessions")
    .select(`
      score, wrong_attempts, hints_used, elapsed_seconds,
      status, started_at, completed_at, mystery_id,
      team:team_id(name)
    `)
    .eq("event_id", event.id)
    .neq("status", "not_started")
    .order("score", { ascending: false });

  if (!sessions) {
    return NextResponse.json({ leaderboard: [], lastUpdated: new Date().toISOString() });
  }

  const teamMap = new Map<string, {
    teamName: string;
    totalScore: number;
    totalTime: number;
    mysteriesCompleted: number;
    hintsUsed: number;
    wrongAttempts: number;
    lastCompletion: string;
  }>();

  for (const s of sessions) {
    const tj = s.team as Record<string, unknown> | Record<string, unknown>[];
    const teamName = (Array.isArray(tj) ? tj[0] : tj)?.name as string | undefined;
    if (!teamName) continue;

    const entry = teamMap.get(teamName) || {
      teamName, totalScore: 0, totalTime: 0, mysteriesCompleted: 0,
      hintsUsed: 0, wrongAttempts: 0, lastCompletion: "",
    };

    entry.totalScore += s.score || 0;
    entry.hintsUsed += s.hints_used || 0;
    entry.wrongAttempts += s.wrong_attempts || 0;

    if (s.status === "completed") {
      entry.mysteriesCompleted += 1;
      entry.totalTime += s.elapsed_seconds || 0;
      if (s.completed_at && (!entry.lastCompletion || s.completed_at > entry.lastCompletion)) {
        entry.lastCompletion = s.completed_at;
      }
    }
    teamMap.set(teamName, entry);
  }

  const leaderboard: LeaderboardEntry[] = Array.from(teamMap.values())
    .sort((a, b) => {
      if (b.mysteriesCompleted !== a.mysteriesCompleted) return b.mysteriesCompleted - a.mysteriesCompleted;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
      if (a.lastCompletion && b.lastCompletion) return a.lastCompletion.localeCompare(b.lastCompletion);
      return 0;
    })
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  if (format === "csv") {
    const header = "Rank,Team,Score,Mysteries Completed,Total Time (s),Hints Used,Wrong Attempts";
    const rows = leaderboard.map(
      (e) => `${e.rank},"${e.teamName}",${e.totalScore},${e.mysteriesCompleted},${e.totalTime},${e.hintsUsed},${e.wrongAttempts}`
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=leaderboard-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  return NextResponse.json({ leaderboard, lastUpdated: new Date().toISOString() });
}
