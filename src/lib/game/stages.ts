/**
 * How much of the case file is open yet.
 *
 * Every clue is authored with an unlockStage of 1–4, which until now drove
 * nothing. Releasing them gradually turns a wall of evidence into an
 * investigation that unfolds — but it must never be able to strand a team,
 * because the decisive clues are spread across all four stages and a team that
 * cannot reach stage 4 cannot close the case.
 *
 * So there are two paths to every stage, and the team gets whichever is
 * further along:
 *
 *   - Investigating opens it. Marking evidence, writing notes, pinning the
 *     board, taking a hint, challenging an alibi, confronting a suspect — any
 *     of these counts, so engaging with the case is what advances it.
 *   - Time opens it anyway. A team that is reading rather than clicking still
 *     progresses, so nobody can be stuck behind a mechanic they haven't found.
 *
 * The second is why this is a pacing device rather than a gate, and why it is
 * computed on the client: it decides what to show, never what is true. The
 * server still grades every accusation against the full case.
 */

export const MAX_STAGE = 4;

/** Investigative actions needed to reach stages 2, 3 and 4. */
const ACTION_THRESHOLDS = [2, 5, 9];

/** Minutes elapsed that will open the next stage regardless of activity. */
const MINUTES_PER_STAGE = 8;

export interface CaseProgress {
  markedEvidence: number;
  notesWritten: number;
  boardPins: number;
  hintsUsed: number;
  alibisChallenged: number;
  confrontationsUsed: number;
  elapsedSeconds: number;
}

export function currentStage(progress: CaseProgress): number {
  const actions =
    progress.markedEvidence +
    progress.notesWritten +
    progress.boardPins +
    progress.hintsUsed +
    progress.alibisChallenged +
    progress.confrontationsUsed;

  let byAction = 1;
  for (const threshold of ACTION_THRESHOLDS) {
    if (actions >= threshold) byAction += 1;
  }

  const byTime =
    1 + Math.floor(progress.elapsedSeconds / 60 / MINUTES_PER_STAGE);

  return Math.min(MAX_STAGE, Math.max(byAction, byTime));
}

/** How many actions until the next stage, for the "still coming" hint. */
export function actionsUntilNextStage(progress: CaseProgress): number | null {
  const stage = currentStage(progress);
  if (stage >= MAX_STAGE) return null;

  const actions =
    progress.markedEvidence +
    progress.notesWritten +
    progress.boardPins +
    progress.hintsUsed +
    progress.alibisChallenged +
    progress.confrontationsUsed;

  const next = ACTION_THRESHOLDS[stage - 1];
  return next === undefined ? null : Math.max(1, next - actions);
}
