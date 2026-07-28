import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/types";

export async function getLeaderboard(
  eventId: string
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("game_sessions")
    .select(
      `
      score,
      wrong_attempts,
      hints_used,
      status,
      started_at,
      completed_at,
      mystery_id,
      team:team_id ( name )
    `
    )
    .eq("event_id", eventId)
    .neq("status", "not_started")
    .order("score", { ascending: false });

  if (!sessions) return [];

  const teamMap = new Map<
    string,
    {
      teamName: string;
      totalScore: number;
      totalTime: number;
      mysteriesCompleted: number;
      hintsUsed: number;
      wrongAttempts: number;
      lastCompletion: string;
    }
  >();

  for (const session of sessions) {
    const teamJoin = session.team as Record<string, unknown> | Record<string, unknown>[];
    const teamName = (
      Array.isArray(teamJoin) ? teamJoin[0] : teamJoin
    )?.name as string | undefined;
    if (!teamName) continue;
    const entry = teamMap.get(teamName) || {
      teamName,
      totalScore: 0,
      totalTime: 0,
      mysteriesCompleted: 0,
      hintsUsed: 0,
      wrongAttempts: 0,
      lastCompletion: "",
    };

    entry.totalScore += session.score || 0;
    entry.hintsUsed += session.hints_used || 0;
    entry.wrongAttempts += session.wrong_attempts || 0;

    if (session.status === "completed") {
      entry.mysteriesCompleted += 1;
      if (
        session.completed_at &&
        session.started_at &&
        (!entry.lastCompletion || session.completed_at > entry.lastCompletion)
      ) {
        entry.lastCompletion = session.completed_at;
        const start = new Date(session.started_at).getTime();
        const end = new Date(session.completed_at).getTime();
        entry.totalTime += Math.floor((end - start) / 1000);
      }
    }

    teamMap.set(teamName, entry);
  }

  return Array.from(teamMap.values())
    .sort((a, b) => {
      if (b.mysteriesCompleted !== a.mysteriesCompleted)
        return b.mysteriesCompleted - a.mysteriesCompleted;
      if (b.totalScore !== a.totalScore)
        return b.totalScore - a.totalScore;
      if (a.totalTime !== b.totalTime)
        return a.totalTime - b.totalTime;
      if (a.lastCompletion && b.lastCompletion)
        return a.lastCompletion.localeCompare(b.lastCompletion);
      return 0;
    })
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}
