import type { BoardPin } from "@/types";

/**
 * The per-team game state document.
 *
 * Three rules govern this file, each because it was broken:
 *
 * 1. OWNERSHIP. `/api/sessions/state` used to overwrite the whole column with
 *    the client's keys, deleting the four the server owns. That is not just a
 *    sync bug — a team could deliberately post a blob without
 *    `challengesBySuspect` and `confrontationsUsed` to refund the anti-grind
 *    budgets. Client writes now arrive as ops that can only name `doc` fields.
 *
 * 2. MERGEABILITY. A whole team plays at once on separate phones. Arrays
 *    cannot merge — a removal is indistinguishable from a stale copy — so
 *    every collaborative field is a keyed cell, and a removal is a tombstone
 *    (`v: false`) rather than a missing key. Without tombstones, a device
 *    holding a stale document resurrects unpinned links forever.
 *
 * 3. ORDERING IS SERVER-ASSIGNED. Cells carry `r`, the revision at which they
 *    were written, never a client clock. Phone clocks drift and are trivially
 *    set forward, and a wall-clock merge would let one device win every
 *    conflict permanently.
 */

export interface Cell<T> {
  v: T;
  /** Session revision at which this was written. Server-assigned. */
  r: number;
  /** Which device wrote it — used only for "edited elsewhere" affordances. */
  by?: string;
}

/** `${evidenceId}|${suspectId}` */
type PinKey = string;

/** Client-owned. Only these may be named by an op. */
export interface SessionDoc {
  notes: Record<string, Cell<string>>;
  evidence: Record<string, Cell<boolean>>;
  pins: Record<PinKey, Cell<boolean>>;
}

/** Server-owned. Never accepted from a client payload. */
export interface SessionServerState {
  challengesBySuspect: Record<string, number>;
  alibisBroken: string[];
  confrontationsUsed: number;
  crackedASuspect: boolean;
}

export interface SessionState {
  v: 2;
  doc: SessionDoc;
  server: SessionServerState;
}

export type OpKind = keyof SessionDoc;
export const OP_KINDS: OpKind[] = ["notes", "evidence", "pins"];

export interface StateOp {
  k: OpKind;
  id: string;
  v: string | boolean;
}

export const MAX_OPS_PER_REQUEST = 200;
export const MAX_NOTE_LENGTH = 4000;

export function emptyState(): SessionState {
  return {
    v: 2,
    doc: { notes: {}, evidence: {}, pins: {} },
    server: {
      challengesBySuspect: {},
      alibisBroken: [],
      confrontationsUsed: 0,
      crackedASuspect: false,
    },
  };
}

export function pinKey(evidenceId: string, suspectId: string): PinKey {
  return `${evidenceId}|${suspectId}`;
}

/**
 * Brings any stored document to the current shape, including the v1 form that
 * used plain arrays. Idempotent, and called on every read, so sessions already
 * in play keep every note and pin. Migrated cells get `r: 0` — older than any
 * real write, so the first genuine edit supersedes them.
 */
export function migrateState(raw: unknown): SessionState {
  const next = emptyState();
  if (!raw || typeof raw !== "object") return next;
  const old = raw as Record<string, unknown>;

  if (old.v === 2 && old.doc && old.server) {
    const typed = old as unknown as SessionState;
    return {
      v: 2,
      doc: {
        notes: typed.doc.notes ?? {},
        evidence: typed.doc.evidence ?? {},
        pins: typed.doc.pins ?? {},
      },
      server: {
        challengesBySuspect: typed.server.challengesBySuspect ?? {},
        alibisBroken: typed.server.alibisBroken ?? [],
        confrontationsUsed: typed.server.confrontationsUsed ?? 0,
        crackedASuspect: typed.server.crackedASuspect ?? false,
      },
    };
  }

  // v1: flat keys, arrays for the set-like fields.
  if (old.notes && typeof old.notes === "object") {
    for (const [id, text] of Object.entries(old.notes as Record<string, unknown>)) {
      if (typeof text === "string") next.doc.notes[id] = { v: text, r: 0 };
    }
  }
  if (Array.isArray(old.importantEvidence)) {
    for (const id of old.importantEvidence) {
      if (typeof id === "string") next.doc.evidence[id] = { v: true, r: 0 };
    }
  }
  if (Array.isArray(old.boardPins)) {
    for (const pin of old.boardPins as BoardPin[]) {
      if (pin?.evidenceId && pin?.suspectId) {
        next.doc.pins[pinKey(pin.evidenceId, pin.suspectId)] = { v: true, r: 0 };
      }
    }
  }

  if (old.challengesBySuspect && typeof old.challengesBySuspect === "object") {
    next.server.challengesBySuspect = old.challengesBySuspect as Record<string, number>;
  }
  if (Array.isArray(old.alibisBroken)) {
    next.server.alibisBroken = old.alibisBroken.filter(
      (id): id is string => typeof id === "string"
    );
  }
  if (typeof old.confrontationsUsed === "number") {
    next.server.confrontationsUsed = old.confrontationsUsed;
  }
  next.server.crackedASuspect = Boolean(old.crackedASuspect);

  // wrongAttempts / hintsUsed are deliberately dropped: the columns are
  // authoritative and the state copies were only ever a cheat surface.
  return next;
}

/**
 * Applies client ops at a server-assigned revision. An op always wins for the
 * exact field it names, because it reached the server later — no clock
 * comparison is involved.
 */
export function applyOps(
  state: SessionState,
  ops: StateOp[],
  revision: number,
  deviceId?: string
): SessionState {
  const doc: SessionDoc = {
    notes: { ...state.doc.notes },
    evidence: { ...state.doc.evidence },
    pins: { ...state.doc.pins },
  };

  for (const op of ops) {
    if (op.k === "notes") {
      doc.notes[op.id] = {
        v: String(op.v).slice(0, MAX_NOTE_LENGTH),
        r: revision,
        by: deviceId,
      };
    } else {
      doc[op.k][op.id] = { v: Boolean(op.v), r: revision, by: deviceId };
    }
  }

  return { v: 2, doc, server: state.server };
}

/** Merges a freshly polled server document into what this device holds. */
export function mergeIncoming(
  local: SessionState,
  server: SessionState
): SessionState {
  const pick = <T>(
    a: Record<string, Cell<T>>,
    b: Record<string, Cell<T>>
  ): Record<string, Cell<T>> => {
    const out = { ...a };
    for (const [key, cell] of Object.entries(b)) {
      const mine = out[key];
      if (!mine || cell.r >= mine.r) out[key] = cell;
    }
    return out;
  };

  return {
    v: 2,
    doc: {
      notes: pick(local.doc.notes, server.doc.notes),
      evidence: pick(local.doc.evidence, server.doc.evidence),
      pins: pick(local.doc.pins, server.doc.pins),
    },
    // Server-owned values are authoritative on arrival.
    server: server.server,
  };
}

/**
 * Validates ops against the mystery's real ids. This is what bounds document
 * growth structurally — a byte cap on the request body stops bounding anything
 * once the server merges rather than replaces.
 */
export function validateOps(
  ops: unknown,
  suspectIds: Set<string>,
  evidenceIds: Set<string>
): { ok: true; ops: StateOp[] } | { ok: false; error: string } {
  if (!Array.isArray(ops)) return { ok: false, error: "ops must be an array" };
  if (ops.length > MAX_OPS_PER_REQUEST) {
    return { ok: false, error: "Too many changes in one save" };
  }

  const clean: StateOp[] = [];
  for (const raw of ops) {
    const op = raw as StateOp;
    if (!op || typeof op.id !== "string") {
      return { ok: false, error: "Malformed op" };
    }
    // A client naming a server-owned field is a bug worth surfacing, not
    // something to drop quietly.
    if (!OP_KINDS.includes(op.k)) {
      return { ok: false, error: `Cannot write "${String(op.k)}"` };
    }

    if (op.k === "notes") {
      if (!suspectIds.has(op.id)) return { ok: false, error: "Unknown suspect" };
      if (typeof op.v !== "string") return { ok: false, error: "Note must be text" };
    } else if (op.k === "evidence") {
      if (!evidenceIds.has(op.id)) return { ok: false, error: "Unknown evidence" };
    } else {
      const [evidenceId, suspectId] = op.id.split("|");
      if (!evidenceIds.has(evidenceId) || !suspectIds.has(suspectId)) {
        return { ok: false, error: "Unknown pin" };
      }
    }
    clean.push(op);
  }

  return { ok: true, ops: clean };
}

// ── selectors: what the UI renders ──

export function markedEvidence(state: SessionState): string[] {
  return Object.entries(state.doc.evidence)
    .filter(([, cell]) => cell.v)
    .map(([id]) => id);
}

export function boardPinList(state: SessionState): BoardPin[] {
  return Object.entries(state.doc.pins)
    .filter(([, cell]) => cell.v)
    .map(([key]) => {
      const [evidenceId, suspectId] = key.split("|");
      return { evidenceId, suspectId, at: 0 };
    });
}

export function notesRecord(state: SessionState): Record<string, string> {
  return Object.fromEntries(
    Object.entries(state.doc.notes).map(([id, cell]) => [id, cell.v])
  );
}
