import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireTeam } from "@/lib/auth/team-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById, getMysteryByOrder } from "@/data/mystery-index";
import { getSolutionById } from "@/data/solutions";
import { getProofSpec, getTrueLinks } from "@/data/deduction";
import { validateMurderer, validateMotive } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/database/ai-log";
import { gradeProof, describeProof } from "@/lib/game/proof";
import { calculateScore, calculateBonuses } from "@/lib/game/scoring";
import { getEventScoring } from "@/lib/database/events";
import type { BoardPin, SuspectRecord } from "@/types";

/**
 * One accusation, one request, one attempt.
 *
 * Everything that decides the score is computed here from server-held state.
 * Previously the client sent its own wrongAttempts and hintsUsed to the
 * completion endpoint and the server scored directly off them, so a team could
 * post zeroes and take a perfect score. Those counters now come from the
 * database row and the elapsed time from started_at.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mysteryId, murdererGuess, motiveGuess, evidenceIds } = body;

    const actor = requireTeam(request, body.teamId);
    if (actor instanceof NextResponse) return actor;
    const teamId = actor.teamId;

    const limitCheck = checkRateLimit(`accuse:${teamId}`);
    if (limitCheck) return limitCheck;

    const mystery = getMysteryById(mysteryId);
    const solution = getSolutionById(mysteryId);
    const proofSpec = getProofSpec(mysteryId);
    if (!mystery || !solution || !proofSpec) {
      return NextResponse.json({ error: "Mystery not found" }, { status: 404 });
    }

    if (
      typeof murdererGuess !== "string" ||
      typeof motiveGuess !== "string" ||
      !murdererGuess.trim() ||
      !motiveGuess.trim()
    ) {
      return NextResponse.json(
        { error: "Name a suspect and give their motive." },
        { status: 400 }
      );
    }
    const chosen: string[] = Array.isArray(evidenceIds)
      ? evidenceIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from("game_sessions")
      .select(
        "id, status, event_id, started_at, wrong_attempts, hints_used, state"
      )
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "No session found" }, { status: 404 });
    }
    if (session.status === "completed" || session.status === "failed") {
      return NextResponse.json(
        { error: "This case is already closed." },
        { status: 409 }
      );
    }

    const { data: event } = await supabase
      .from("events")
      .select("max_attempts")
      .eq("id", session.event_id)
      .maybeSingle();
    const maxAttempts = event?.max_attempts || 10;

    // Server-derived, so neither the timer nor the counters can be edited.
    const elapsedSeconds = session.started_at
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
        )
      : 0;
    const hintsUsed = session.hints_used ?? 0;
    const priorAttempts = session.wrong_attempts ?? 0;

    // Grade all three parts of the accusation together.
    const suspects: SuspectRecord[] = mystery.suspects.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      aliases:
        s.name.toLowerCase() === solution.murderer.toLowerCase()
          ? solution.murdererAliases
          : [],
    }));

    const [murderer, motive] = await Promise.all([
      validateMurderer({
        guess: murdererGuess,
        correctMurderer: solution.murderer,
        suspects,
      }),
      validateMotive({
        playerMotive: motiveGuess,
        canonicalMotive: solution.motiveSummary,
        requiredConcepts: solution.motiveRequiredConcepts,
        acceptableInterpretations: solution.acceptableMotiveInterpretations,
        commonIncorrectInterpretations:
          solution.commonIncorrectMotiveInterpretations || [],
        mysteryContext: `${mystery.title}: ${mystery.introduction}`,
      }),
    ]);

    const proof = gradeProof(chosen, proofSpec);

    logAiInteraction(
      `${teamId}_${mysteryId}`,
      "murderer_validation",
      murdererGuess,
      JSON.stringify(murderer)
    );

    // The AI being unavailable must never cost anyone an attempt.
    if (murderer.status === "unavailable" || motive.status === "unavailable") {
      return NextResponse.json({
        verdict: "unavailable",
        message:
          "The case could not be checked just now. Nothing was counted against you — try again in a moment.",
      });
    }

    const solved =
      murderer.status === "correct" &&
      motive.status === "correct" &&
      proof.verdict === "proven";

    if (!solved) {
      const wrongAttempts = priorAttempts + 1;
      const failed = wrongAttempts >= maxAttempts;

      await supabase
        .from("game_sessions")
        .update({
          wrong_attempts: wrongAttempts,
          status: failed ? "failed" : "in_progress",
          completed_at: failed ? new Date().toISOString() : null,
          elapsed_seconds: elapsedSeconds,
          last_saved_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      return NextResponse.json({
        verdict: failed ? "failed" : "rejected",
        wrongAttempts,
        maxAttempts,
        parts: {
          murderer: murderer.status,
          motive: motive.status,
          proof: {
            verdict: proof.verdict,
            missingCount: proof.missingCount,
            noiseCount: proof.noiseCount,
          },
        },
        feedback: {
          murderer: murderer.status === "correct" ? null : murderer.feedback,
          motive: motive.status === "correct" ? null : motive.feedback,
          proof: proof.verdict === "proven" ? null : describeProof(proof),
        },
      });
    }

    // Solved. Score with the event's own rules.
    const scoring = await getEventScoring(supabase, session.event_id);
    const result = calculateScore(
      { elapsedSeconds, wrongAttempts: priorAttempts, hintsUsed, completed: true },
      scoring
    );

    const state = (session.state ?? {}) as Record<string, unknown>;
    const pins = Array.isArray(state.boardPins)
      ? (state.boardPins as BoardPin[])
      : [];
    const alibisBroken = Array.isArray(state.alibisBroken)
      ? (state.alibisBroken as string[]).length
      : 0;
    const cracked = Boolean(state.crackedASuspect);

    const bonuses = calculateBonuses(
      {
        cleanProof: proof.noiseCount === 0,
        alibisBroken,
        boardF1: boardF1(pins, getTrueLinks(mysteryId)),
        boardPins: pins.length,
        crackedASuspect: cracked,
      },
      scoring
    );

    const finalScore = result.score + bonuses.total;
    const now = new Date().toISOString();

    await supabase
      .from("game_sessions")
      .update({
        status: "completed",
        score: finalScore,
        elapsed_seconds: elapsedSeconds,
        completed_at: now,
        last_saved_at: now,
      })
      .eq("id", session.id);

    // Open the next case.
    let nextMysteryId: string | null = null;
    const next = getMysteryByOrder(mystery.order + 1);
    if (next) {
      nextMysteryId = next.id;
      await supabase.from("game_sessions").insert({
        event_id: session.event_id,
        team_id: teamId,
        mystery_id: next.id,
        status: "not_started",
        last_saved_at: now,
      });
    }

    const timePenalty = Math.floor((elapsedSeconds / 60) * scoring.timePenaltyPerMinute);

    return NextResponse.json({
      verdict: "solved",
      score: finalScore,
      nextMysteryId,
      breakdown: {
        base: scoring.baseScore,
        timePenalty,
        wrongPenalty: priorAttempts * scoring.wrongAttemptPenalty,
        hintPenalty: hintsUsed * scoring.hintPenalty,
        bonus: result.bonus,
        minimumScore: scoring.minimumScore,
        total: finalScore,
      },
      bonuses,
    });
  } catch (err) {
    console.error("accuse error:", err);
    return NextResponse.json(
      { error: "Something went wrong checking that accusation." },
      { status: 500 }
    );
  }
}

/**
 * F1 of the team's board against the authored links. Raw hit-count would
 * reward pinning everything to everyone; F1 punishes that through precision.
 */
function boardF1(
  pins: BoardPin[],
  trueLinks: { evidenceId: string; suspectIds: string[] }[]
): number {
  if (pins.length === 0) return 0;

  const truth = new Set<string>();
  for (const link of trueLinks) {
    for (const suspectId of link.suspectIds) {
      truth.add(`${link.evidenceId}|${suspectId}`);
    }
  }
  if (truth.size === 0) return 0;

  const drawn = new Set(pins.map((p) => `${p.evidenceId}|${p.suspectId}`));
  let hits = 0;
  for (const key of drawn) if (truth.has(key)) hits++;

  const precision = hits / drawn.size;
  const recall = hits / truth.size;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}
