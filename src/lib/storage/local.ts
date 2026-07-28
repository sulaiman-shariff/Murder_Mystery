import type { GameSession, Team } from "@/types";
import { getMysteryById, getMysteryByOrder } from "@/data/mystery-index";

const KEYS = {
  TEAM: "mm_team",
  TEAMS_REGISTRY: "mm_teams_registry",
  SESSION_PREFIX: "mm_session_",
  TIMER_PREFIX: "mm_timer_",
  COMPLETED: "mm_completed",
  NOTES_PREFIX: "mm_notes_",
  IMPORTANT_EVIDENCE: "mm_important_evidence",
  WRONG_ATTEMPTS: "mm_wrong_attempts_",
  HINTS_USED: "mm_hints_used_",
};

interface LocalTeam {
  id: string;
  name: string;
  pin: string;
  eventId: string;
  eventCode: string;
}

export function saveTeam(team: LocalTeam): void {
  localStorage.setItem(KEYS.TEAM, JSON.stringify(team));
}

export function getTeam(): LocalTeam | null {
  try {
    const raw = localStorage.getItem(KEYS.TEAM);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTeam(): void {
  localStorage.removeItem(KEYS.TEAM);
}

export function getTimerStart(mysteryId: string): number {
  const key = KEYS.TIMER_PREFIX + mysteryId;
  let start = localStorage.getItem(key);
  if (!start) {
    start = Date.now().toString();
    localStorage.setItem(key, start);
  }
  return parseInt(start);
}

export function getElapsedSeconds(mysteryId: string): number {
  const start = getTimerStart(mysteryId);
  return Math.floor((Date.now() - start) / 1000);
}

export function saveNotes(mysteryId: string, suspectId: string, notes: string): void {
  const key = KEYS.NOTES_PREFIX + mysteryId;
  const all = getNotes(mysteryId);
  all[suspectId] = notes;
  localStorage.setItem(key, JSON.stringify(all));
}

export function getNotes(mysteryId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEYS.NOTES_PREFIX + mysteryId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleImportantEvidence(
  mysteryId: string,
  evidenceId: string
): boolean {
  const key = KEYS.IMPORTANT_EVIDENCE + "_" + mysteryId;
  let set: string[] = [];
  try {
    const raw = localStorage.getItem(key);
    set = raw ? JSON.parse(raw) : [];
  } catch {
    // ignore
  }
  const idx = set.indexOf(evidenceId);
  if (idx >= 0) {
    set.splice(idx, 1);
  } else {
    set.push(evidenceId);
  }
  localStorage.setItem(key, JSON.stringify(set));
  return idx < 0;
}

export function getImportantEvidence(mysteryId: string): string[] {
  try {
    const raw = localStorage.getItem(KEYS.IMPORTANT_EVIDENCE + "_" + mysteryId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markCompleted(mysteryId: string, score: number): void {
  const all = getCompletedMysteries();
  all[mysteryId] = { completedAt: Date.now(), score };
  localStorage.setItem(KEYS.COMPLETED, JSON.stringify(all));
}

export function getCompletedMysteries(): Record<string, { completedAt: number; score: number }> {
  try {
    const raw = localStorage.getItem(KEYS.COMPLETED);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isMysteryCompleted(mysteryId: string): boolean {
  return mysteryId in getCompletedMysteries();
}

export function getNextMysteryId(currentMysteryId: string): string | null {
  const current = getMysteryById(currentMysteryId);
  if (!current) return null;
  const next = getMysteryByOrder(current.order + 1);
  return next?.id || null;
}

// ── Team Registry (localStorage fallback) ──

interface RegistryTeam {
  id: string;
  name: string;
  pin: string;
  eventCode: string;
  createdAt: string;
  lastActiveAt: string;
}

export function registerTeamLocal(
  name: string,
  pin: string,
  eventCode: string
): RegistryTeam {
  const teams = getAllTeamsLocal();
  const existing = teams.find(
    (t) => t.name.toLowerCase() === name.toLowerCase() && t.eventCode === eventCode
  );
  if (existing) {
    throw new Error("Team name already taken in this event");
  }

  const team: RegistryTeam = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    pin,
    eventCode,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  teams.push(team);
  localStorage.setItem(KEYS.TEAMS_REGISTRY, JSON.stringify(teams));
  return team;
}

export function loginTeamLocal(
  name: string,
  pin: string,
  eventCode: string
): RegistryTeam {
  const teams = getAllTeamsLocal();
  const team = teams.find(
    (t) =>
      t.name.toLowerCase() === name.toLowerCase() &&
      t.pin === pin &&
      t.eventCode === eventCode
  );

  if (!team) {
    throw new Error("Invalid team name or PIN");
  }

  team.lastActiveAt = new Date().toISOString();
  localStorage.setItem(KEYS.TEAMS_REGISTRY, JSON.stringify(teams));
  return team;
}

export function getAllTeamsLocal(): RegistryTeam[] {
  try {
    const raw = localStorage.getItem(KEYS.TEAMS_REGISTRY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function checkTeamNameAvailableLocal(
  name: string,
  eventCode: string
): boolean {
  const teams = getAllTeamsLocal();
  return !teams.find(
    (t) => t.name.toLowerCase() === name.toLowerCase() && t.eventCode === eventCode
  );
}

export function getWrongAttempts(mysteryId: string): number {
  try {
    const raw = localStorage.getItem(KEYS.WRONG_ATTEMPTS + mysteryId);
    return raw ? parseInt(raw) : 0;
  } catch {
    return 0;
  }
}

export function incrementWrongAttempts(mysteryId: string): number {
  const current = getWrongAttempts(mysteryId) + 1;
  localStorage.setItem(KEYS.WRONG_ATTEMPTS + mysteryId, current.toString());
  return current;
}

export function getHintsUsed(mysteryId: string): number {
  try {
    const raw = localStorage.getItem(KEYS.HINTS_USED + mysteryId);
    return raw ? parseInt(raw) : 0;
  } catch {
    return 0;
  }
}

export function incrementHintsUsed(mysteryId: string): number {
  const current = getHintsUsed(mysteryId) + 1;
  localStorage.setItem(KEYS.HINTS_USED + mysteryId, current.toString());
  return current;
}

export function resetMysteryProgress(mysteryId: string): void {
  localStorage.removeItem(KEYS.WRONG_ATTEMPTS + mysteryId);
  localStorage.removeItem(KEYS.HINTS_USED + mysteryId);
  localStorage.removeItem(KEYS.TIMER_PREFIX + mysteryId);
  localStorage.removeItem(KEYS.NOTES_PREFIX + mysteryId);
  localStorage.removeItem(KEYS.IMPORTANT_EVIDENCE + "_" + mysteryId);
  const completed = getCompletedMysteries();
  delete completed[mysteryId];
  localStorage.setItem(KEYS.COMPLETED, JSON.stringify(completed));
}

export function getLeaderboardLocal(): {
  teamName: string;
  totalScore: number;
  totalTime: number;
  mysteriesCompleted: number;
  hintsUsed: number;
  wrongAttempts: number;
}[] {
  const completed = getCompletedMysteries();
  const team = getTeam();
  if (!team) return [];

  let totalScore = 0;
  let totalTime = 0;
  let totalHints = 0;
  let totalWrong = 0;

  for (const [mysteryId, data] of Object.entries(completed)) {
    totalScore += data.score;
    totalHints += getHintsUsed(mysteryId);
    totalWrong += getWrongAttempts(mysteryId);
  }

  return [
    {
      teamName: team.name,
      totalScore,
      totalTime,
      mysteriesCompleted: Object.keys(completed).length,
      hintsUsed: totalHints,
      wrongAttempts: totalWrong,
    },
  ];
}
