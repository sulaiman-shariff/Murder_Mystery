import type { GameSession, Team } from "@/types";
import { getMysteryById, getMysteryByOrder } from "@/data/mystery-index";

function key(eventId: string, teamId: string, sub: string): string {
  return `mm:${eventId}:${teamId}:${sub}`;
}

function getTeamContext(): { eventId: string; teamId: string } | null {
  try {
    const raw = localStorage.getItem("mm_team");
    if (!raw) return null;
    const team = JSON.parse(raw);
    return { eventId: team.eventId || "default", teamId: team.id || "unknown" };
  } catch {
    return null;
  }
}

// ── Team ──

interface LocalTeam {
  id: string;
  name: string;
  pin: string;
  eventId: string;
  eventCode: string;
}

export function saveTeam(team: LocalTeam): void {
  localStorage.setItem("mm_team", JSON.stringify(team));
}

export function getTeam(): LocalTeam | null {
  try {
    const raw = localStorage.getItem("mm_team");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTeam(): void {
  const ctx = getTeamContext();
  if (ctx) {
    const prefix = `mm:${ctx.eventId}:${ctx.teamId}:`;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  }
  localStorage.removeItem("mm_team");
}

// ── Timer ──

export function getTimerStart(mysteryId: string): number {
  const ctx = getTeamContext();
  if (!ctx) return fallbackTimerStart(mysteryId);
  const k = key(ctx.eventId, ctx.teamId, `${mysteryId}:timer`);
  let start = localStorage.getItem(k);
  if (!start) {
    start = Date.now().toString();
    localStorage.setItem(k, start);
  }
  return parseInt(start);
}

function fallbackTimerStart(mysteryId: string): number {
  const k = `mm_timer_${mysteryId}`;
  let start = localStorage.getItem(k);
  if (!start) {
    start = Date.now().toString();
    localStorage.setItem(k, start);
  }
  return parseInt(start);
}

export function getElapsedSeconds(mysteryId: string): number {
  const start = getTimerStart(mysteryId);
  return Math.floor((Date.now() - start) / 1000);
}

// ── Notes ──

export function saveNotes(mysteryId: string, suspectId: string, notes: string): void {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:notes`;
  const all = getNotes(mysteryId);
  all[suspectId] = notes;
  localStorage.setItem(k, JSON.stringify(all));
}

export function getNotes(mysteryId: string): Record<string, string> {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:notes`;
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ── Important Evidence ──

export function toggleImportantEvidence(
  mysteryId: string,
  evidenceId: string
): boolean {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:evidence`;
  let set: string[] = [];
  try {
    const raw = localStorage.getItem(k);
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
  localStorage.setItem(k, JSON.stringify(set));
  return idx < 0;
}

export function getImportantEvidence(mysteryId: string): string[] {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:evidence`;
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Completed Mysteries ──

export function markCompleted(mysteryId: string, score: number): void {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:completed`;
  const all = getCompletedMysteries();
  all[mysteryId] = { completedAt: Date.now(), score };
  localStorage.setItem(k, JSON.stringify(all));
}

export function getCompletedMysteries(): Record<string, { completedAt: number; score: number }> {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:completed`;
  try {
    const raw = localStorage.getItem(k);
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
  localStorage.setItem("mm_teams_registry", JSON.stringify(teams));
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
  localStorage.setItem("mm_teams_registry", JSON.stringify(teams));
  return team;
}

export function getAllTeamsLocal(): RegistryTeam[] {
  try {
    const raw = localStorage.getItem("mm_teams_registry");
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

// ── Wrong Attempts ──

export function getWrongAttempts(mysteryId: string): number {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:wrong`;
  try {
    const raw = localStorage.getItem(k);
    return raw ? parseInt(raw) : 0;
  } catch {
    return 0;
  }
}

export function incrementWrongAttempts(mysteryId: string): number {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:wrong`;
  const current = getWrongAttempts(mysteryId) + 1;
  localStorage.setItem(k, current.toString());
  return current;
}

// ── Hints ──

export function getHintsUsed(mysteryId: string): number {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:hints`;
  try {
    const raw = localStorage.getItem(k);
    return raw ? parseInt(raw) : 0;
  } catch {
    return 0;
  }
}

export function incrementHintsUsed(mysteryId: string): number {
  const ctx = getTeamContext();
  const prefix = ctx ? `mm:${ctx.eventId}:${ctx.teamId}` : "mm";
  const k = `${prefix}:${mysteryId}:hints`;
  const current = getHintsUsed(mysteryId) + 1;
  localStorage.setItem(k, current.toString());
  return current;
}

export function resetMysteryProgress(mysteryId: string): void {
  const ctx = getTeamContext();
  if (!ctx) return;
  const prefix = `mm:${ctx.eventId}:${ctx.teamId}:`;
  const keys = [
    `${prefix}${mysteryId}:wrong`,
    `${prefix}${mysteryId}:hints`,
    `${prefix}${mysteryId}:timer`,
    `${prefix}${mysteryId}:notes`,
    `${prefix}${mysteryId}:evidence`,
    `${prefix}${mysteryId}:board`,
  ];
  keys.forEach((k) => localStorage.removeItem(k));
  const completed = getCompletedMysteries();
  delete completed[mysteryId];
  const ck = `${prefix}completed`;
  localStorage.setItem(ck, JSON.stringify(completed));
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

  for (const mysteryId of Object.keys(completed)) {
    totalScore += completed[mysteryId].score;
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

// ── Reconciliation ──

export function reconcileWithServer(mysteryId: string, dbState: {
  wrongAttempts: number;
  hintsUsed: number;
  state?: Record<string, unknown>;
}): void {
  const ctx = getTeamContext();
  if (!ctx) return;
  const prefix = `mm:${ctx.eventId}:${ctx.teamId}:${mysteryId}`;

  const localWrong = getWrongAttempts(mysteryId);
  if (dbState.wrongAttempts > localWrong) {
    localStorage.setItem(`${prefix}:wrong`, dbState.wrongAttempts.toString());
  }

  const localHints = getHintsUsed(mysteryId);
  if (dbState.hintsUsed > localHints) {
    localStorage.setItem(`${prefix}:hints`, dbState.hintsUsed.toString());
  }
}
