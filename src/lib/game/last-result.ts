"use client";

export interface ScoreBreakdown {
  base: number;
  timePenalty: number;
  wrongPenalty: number;
  hintPenalty: number;
  bonus: number;
  minimumScore: number;
  total: number;
}

export interface LastResult {
  mysteryId: string;
  score: number;
  elapsedSeconds: number;
  breakdown?: ScoreBreakdown;
}

const KEY = "mm_last_result";

/**
 * Carries the server's score breakdown from the play screen to the win
 * screen. The win screen used to recompute the breakdown itself with the
 * default settings and hardcoded zero penalties, so the numbers it showed
 * did not add up to the score beside them.
 */
export function storeLastResult(result: LastResult): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    // Private mode or a full quota: the win screen just omits the breakdown.
  }
}

export function readLastResult(mysteryId: string): LastResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastResult;
    return parsed.mysteryId === mysteryId ? parsed : null;
  } catch {
    return null;
  }
}
