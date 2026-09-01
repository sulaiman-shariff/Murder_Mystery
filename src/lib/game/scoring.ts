import type { ScoreInput, ScoreResult, ScoringSettings } from "@/types";

export const DEFAULT_SCORING: ScoringSettings = {
  baseScore: 1000,
  wrongAttemptPenalty: 150,
  hintPenalty: 100,
  timePenaltyPerMinute: 10,
  speedBonusThresholdMinutes: 30,
  speedBonus: 50,
  minimumScore: 100,
  proofBonus: 100,
  alibiBonusPerBreak: 40,
  alibiBonusCap: 80,
  boardAccuracyBonus: 60,
  interrogationBonus: 30,
};

export interface BonusInput {
  /** Proof graded "proven" with no stray picks. */
  cleanProof: boolean;
  alibisBroken: number;
  /** Harmonic mean of board precision and recall, 0-1. */
  boardF1: number;
  boardPins: number;
  crackedASuspect: boolean;
}

export interface BonusResult {
  proof: number;
  alibi: number;
  board: number;
  interrogation: number;
  total: number;
}

/**
 * Bonuses for the optional deduction tools.
 *
 * Board accuracy uses F1 rather than raw hits: counting hits would reward
 * pinning every clue to every suspect, whereas F1 collapses the moment
 * precision does. It also requires a minimum number of pins, so a single
 * lucky link earns nothing.
 */
export function calculateBonuses(
  input: BonusInput,
  settings: ScoringSettings = DEFAULT_SCORING
): BonusResult {
  const proof = input.cleanProof ? settings.proofBonus : 0;
  const alibi = Math.min(
    input.alibisBroken * settings.alibiBonusPerBreak,
    settings.alibiBonusCap
  );
  const board =
    input.boardPins >= 3
      ? Math.round(settings.boardAccuracyBonus * Math.max(0, Math.min(1, input.boardF1)))
      : 0;
  const interrogation = input.crackedASuspect ? settings.interrogationBonus : 0;

  return {
    proof,
    alibi,
    board,
    interrogation,
    total: proof + alibi + board + interrogation,
  };
}

export function calculateScore(
  input: ScoreInput,
  settings: ScoringSettings = DEFAULT_SCORING
): ScoreResult {
  if (!input.completed) {
    return {
      score: 0,
      elapsedSeconds: input.elapsedSeconds,
      wrongAttempts: input.wrongAttempts,
      hintsUsed: input.hintsUsed,
      penalties: 0,
      bonus: 0,
    };
  }

  const timeMinutes = input.elapsedSeconds / 60;

  const timePenalty = Math.floor(timeMinutes * settings.timePenaltyPerMinute);
  const wrongPenalty = input.wrongAttempts * settings.wrongAttemptPenalty;
  const hintPenalty = input.hintsUsed * settings.hintPenalty;
  const totalPenalties = timePenalty + wrongPenalty + hintPenalty;

  let score = settings.baseScore - totalPenalties;

  let bonus = 0;
  if (timeMinutes < settings.speedBonusThresholdMinutes) {
    bonus = settings.speedBonus;
    score += bonus;
  }

  score = Math.max(settings.minimumScore, score);

  return {
    score,
    elapsedSeconds: input.elapsedSeconds,
    wrongAttempts: input.wrongAttempts,
    hintsUsed: input.hintsUsed,
    penalties: totalPenalties,
    bonus,
  };
}
