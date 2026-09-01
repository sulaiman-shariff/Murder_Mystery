import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { calculateScore } from "@/lib/game/scoring";
import { getEventScoring } from "@/lib/database/events";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById, getMysteryByOrder } from "@/data/mystery-index";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`sessions:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { teamId, mysteryId, status, score, wrongAttempts, hintsUsed, elapsedSeconds } = body;

    if (!teamId || !mysteryId || !status) {
      return NextResponse.json(
        { error: "teamId, mysteryId, and status are required" },
        { status: 400 }
      );
    }

    if (!["completed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'completed' or 'failed'" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("id, status, event_id")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "No session found for this team and mystery" },
        { status: 404 }
      );
    }

    if (session.status === "completed" || session.status === "failed") {
      return NextResponse.json(
        { error: "This session has already been completed" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Score with the event's own rules, not the defaults — the admin
    // Settings tab writes these and players expect them to apply.
    const scoring = await getEventScoring(supabase, session.event_id);

    const result = calculateScore(
      {
        elapsedSeconds: elapsedSeconds ?? 0,
        wrongAttempts: wrongAttempts ?? 0,
        hintsUsed: hintsUsed ?? 0,
        completed: status === "completed",
      },
      scoring
    );

    const { error } = await supabase
      .from("game_sessions")
      .update({
        status,
        score: result.score,
        wrong_attempts: wrongAttempts ?? 0,
        hints_used: hintsUsed ?? 0,
        elapsed_seconds: elapsedSeconds ?? 0,
        completed_at: status === "completed" ? now : null,
        last_saved_at: now,
      })
      .eq("id", session.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentMystery = getMysteryById(mysteryId);
    let nextSessionId: string | null = null;
    let nextMysteryId: string | null = null;

    if (status === "completed" && currentMystery) {
      const nextMystery = getMysteryByOrder(currentMystery.order + 1);
      if (nextMystery) {
        nextMysteryId = nextMystery.id;

        const { data: nextSession } = await supabase
          .from("game_sessions")
          .insert({
            event_id: session.event_id,
            team_id: teamId,
            mystery_id: nextMystery.id,
            status: "not_started",
            last_saved_at: now,
          })
          .select("id")
          .single();

        if (nextSession) {
          nextSessionId = nextSession.id;
        }
      }
    }

    // The win screen renders this breakdown; it must be the same arithmetic
    // the server just used, or the numbers on screen will not add up.
    const timePenalty = Math.floor(
      ((elapsedSeconds ?? 0) / 60) * scoring.timePenaltyPerMinute
    );

    return NextResponse.json({
      success: true,
      score: result.score,
      nextSessionId,
      nextMysteryId,
      breakdown: {
        base: scoring.baseScore,
        timePenalty,
        wrongPenalty: (wrongAttempts ?? 0) * scoring.wrongAttemptPenalty,
        hintPenalty: (hintsUsed ?? 0) * scoring.hintPenalty,
        bonus: result.bonus,
        minimumScore: scoring.minimumScore,
        total: result.score,
      },
    });
  } catch (err) {
    console.error("Session complete API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
