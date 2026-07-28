import type { ScoreInput, ScoreResult, ScoringSettings } from "@/types";

export const DEFAULT_SCORING: ScoringSettings = {
  baseScore: 1000,
  wrongAttemptPenalty: 150,
  hintPenalty: 100,
  timePenaltyPerMinute: 10,
  speedBonusThresholdMinutes: 30,
  speedBonus: 50,
  minimumScore: 100,
};

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
