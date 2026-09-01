/**
 * Turns a team's raw session row into the flags an operator acts on.
 *
 * Pure and exported so the thresholds are testable and live in one place
 * rather than being scattered through JSX.
 */
export const QUIET_AFTER_SECONDS = 8 * 60;
export const STALLED_AFTER_SECONDS = 25 * 60;
export const LOW_ATTEMPTS = 2;
export const NOT_STARTED_AFTER_SECONDS = 10 * 60;

export type TeamFlag =
  | "quiet"
  | "stalled"
  | "burning-attempts"
  | "locked-out"
  | "not-started";

export interface MonitorInput {
  status: string;
  secondsOnCase: number;
  secondsSinceActivity: number;
  wrongAttempts: number;
  hintsUsed: number;
  attemptsRemaining: number;
  secondsSinceRegistered: number;
  hasAnySession: boolean;
}

export function flagTeam(input: MonitorInput): TeamFlag[] {
  const flags: TeamFlag[] = [];

  if (input.status === "failed") flags.push("locked-out");

  if (!input.hasAnySession) {
    if (input.secondsSinceRegistered > NOT_STARTED_AFTER_SECONDS) {
      flags.push("not-started");
    }
    return flags;
  }

  if (input.status === "in_progress") {
    if (input.secondsSinceActivity > QUIET_AFTER_SECONDS) flags.push("quiet");

    // Been at it a long while with nothing to show for it — they are lost
    // rather than merely slow.
    if (
      input.secondsOnCase > STALLED_AFTER_SECONDS &&
      input.wrongAttempts === 0 &&
      input.hintsUsed === 0
    ) {
      flags.push("stalled");
    }

    if (input.attemptsRemaining <= LOW_ATTEMPTS) flags.push("burning-attempts");
  }

  return flags;
}

export const FLAG_LABELS: Record<TeamFlag, string> = {
  quiet: "Gone quiet",
  stalled: "Stuck",
  "burning-attempts": "Nearly out",
  "locked-out": "Locked out",
  "not-started": "Not started",
};
