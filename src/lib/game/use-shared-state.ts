"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyState,
  migrateState,
  mergeIncoming,
  applyOps,
  markedEvidence,
  boardPinList,
  notesRecord,
  pinKey,
  type SessionState,
  type StateOp,
} from "@/lib/game/session-state";
import type { BoardPin } from "@/types";

const POLL_ACTIVE_MS = 3_000;
const POLL_IDLE_MS = 15_000;
const IDLE_AFTER_MS = 60_000;
const FLUSH_DEBOUNCE_MS = 1_000;

/** Identifies this browser so "edited on another device" can be shown. */
function deviceId(): string {
  try {
    const existing = localStorage.getItem("mm_device");
    if (existing) return existing;
    const id = `d_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("mm_device", id);
    return id;
  } catch {
    return "d_anon";
  }
}

/**
 * The team's shared game document.
 *
 * A whole team plays at once on separate phones, so this holds an optimistic
 * local copy, queues changes as ops, and polls for everyone else's. Ops rather
 * than a whole document because a snapshot cannot express a removal distinctly
 * from a stale copy — two phones would resurrect each other's unpinned links
 * forever.
 */
export function useSharedState(mysteryId: string, enabled: boolean) {
  const [state, setState] = useState<SessionState>(emptyState);
  const revisionRef = useRef(-1);
  const outboxRef = useRef<Map<string, StateOp>>(new Map());
  const inFlightRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangeRef = useRef(Date.now());
  const device = useRef<string>("");

  if (!device.current && typeof window !== "undefined") {
    device.current = deviceId();
  }

  /** Seeds from whatever /api/sessions/start returned. */
  const hydrate = useCallback((raw: unknown, revision: number) => {
    setState(migrateState(raw));
    revisionRef.current = revision;
  }, []);

  const flush = useCallback(async () => {
    if (inFlightRef.current || outboxRef.current.size === 0) return;
    const ops = [...outboxRef.current.values()];
    outboxRef.current.clear();
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/sessions/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mysteryId, ops, deviceId: device.current }),
      });
      if (res.ok) {
        const data = await res.json();
        revisionRef.current = data.revision;
        // The response carries the merged document, so no extra poll is needed.
        if (data.state) setState((local) => mergeIncoming(local, data.state));
      } else {
        // Put them back so nothing is silently lost.
        for (const op of ops) outboxRef.current.set(`${op.k}:${op.id}`, op);
      }
    } catch {
      for (const op of ops) outboxRef.current.set(`${op.k}:${op.id}`, op);
    } finally {
      inFlightRef.current = false;
    }
  }, [mysteryId]);

  /** Queues an op, coalescing repeated edits to the same field. */
  const queue = useCallback(
    (op: StateOp) => {
      outboxRef.current.set(`${op.k}:${op.id}`, op);
      lastChangeRef.current = Date.now();
      // Optimistic: show it immediately at a revision above anything seen, so
      // an in-flight poll cannot momentarily undo the user's own typing.
      setState((local) => applyOps(local, [op], revisionRef.current + 1, device.current));

      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
    },
    [flush]
  );

  // ── the poll ──
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      if (document.visibilityState === "visible" && revisionRef.current >= 0) {
        try {
          const res = await fetch(
            `/api/sessions/state?mysteryId=${encodeURIComponent(mysteryId)}&since=${revisionRef.current}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.changed && data.state) {
              revisionRef.current = data.revision;
              lastChangeRef.current = Date.now();
              setState((local) => mergeIncoming(local, migrateState(data.state)));
            }
          }
        } catch {
          // A dropped poll is not worth surfacing; the next one will catch up.
        }
      }
      const idle = Date.now() - lastChangeRef.current > IDLE_AFTER_MS;
      timer = setTimeout(tick, idle ? POLL_IDLE_MS : POLL_ACTIVE_MS);
    }

    timer = setTimeout(tick, POLL_ACTIVE_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        lastChangeRef.current = Date.now();
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mysteryId, enabled]);

  // Flush on the way out. A plain fetch is routinely killed by the navigation
  // that triggers it, so use sendBeacon.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (outboxRef.current.size === 0) return;
      try {
        navigator.sendBeacon(
          "/api/sessions/state",
          new Blob(
            [
              JSON.stringify({
                mysteryId,
                deviceId: device.current,
                ops: [...outboxRef.current.values()],
              }),
            ],
            { type: "application/json" }
          )
        );
      } catch {
        // Nothing more we can do at teardown.
      }
    };
  }, [mysteryId]);

  const setNote = useCallback(
    (suspectId: string, text: string) => queue({ k: "notes", id: suspectId, v: text }),
    [queue]
  );

  const toggleEvidence = useCallback(
    (evidenceId: string) => {
      const on = !state.doc.evidence[evidenceId]?.v;
      queue({ k: "evidence", id: evidenceId, v: on });
    },
    [queue, state.doc.evidence]
  );

  const togglePin = useCallback(
    (evidenceId: string, suspectId: string) => {
      const key = pinKey(evidenceId, suspectId);
      const on = !state.doc.pins[key]?.v;
      queue({ k: "pins", id: key, v: on });
    },
    [queue, state.doc.pins]
  );

  const setPins = useCallback(
    (next: BoardPin[]) => {
      // BoardPanel hands back a whole list; diff it into ops.
      const wanted = new Set(next.map((p) => pinKey(p.evidenceId, p.suspectId)));
      const current = new Set(
        Object.entries(state.doc.pins)
          .filter(([, cell]) => cell.v)
          .map(([k]) => k)
      );
      for (const key of wanted) {
        if (!current.has(key)) queue({ k: "pins", id: key, v: true });
      }
      for (const key of current) {
        if (!wanted.has(key)) queue({ k: "pins", id: key, v: false });
      }
    },
    [queue, state.doc.pins]
  );

  return {
    state,
    hydrate,
    notes: notesRecord(state),
    importantEvidence: markedEvidence(state),
    boardPins: boardPinList(state),
    alibisBroken: state.server.alibisBroken,
    setNote,
    toggleEvidence,
    togglePin,
    setPins,
  };
}
