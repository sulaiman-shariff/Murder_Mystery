"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getTimerStart,
  getElapsedSeconds,
  getWrongAttempts,
  incrementWrongAttempts,
  getHintsUsed,
  incrementHintsUsed,
} from "@/lib/storage/local";
import type { Mystery } from "@/types";

interface GameState {
  sessionId: string;
  startedAt: number;
  elapsedSeconds: number;
  wrongAttempts: number;
  hintsUsed: number;
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

export function useGameSession(mystery: Mystery | null) {
  const [state, setState] = useState<GameState>({
    sessionId: "",
    startedAt: 0,
    elapsedSeconds: 0,
    wrongAttempts: 0,
    hintsUsed: 0,
    isRunning: false,
    isCompleted: false,
    isFailed: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!mystery) return;

    const timerStart = getTimerStart(mystery.id);
    const elapsed = getElapsedSeconds(mystery.id);
    const savedWrong = getWrongAttempts(mystery.id);
    const savedHints = getHintsUsed(mystery.id);

    setState((prev) => ({
      ...prev,
      sessionId: `${mystery.id}_${timerStart}`,
      startedAt: timerStart,
      elapsedSeconds: elapsed,
      wrongAttempts: savedWrong,
      hintsUsed: savedHints,
      isRunning: true,
    }));

    intervalRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedSeconds: getElapsedSeconds(mystery.id),
      }));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mystery?.id]);

  const recordWrongAttempt = useCallback(() => {
    if (!mystery) return;
    const next = incrementWrongAttempts(mystery.id);
    setState((prev) => ({ ...prev, wrongAttempts: next }));
  }, [mystery?.id]);

  const recordHint = useCallback(() => {
    if (!mystery) return;
    const next = incrementHintsUsed(mystery.id);
    setState((prev) => ({ ...prev, hintsUsed: next }));
  }, [mystery?.id]);

  const completeSession = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false, isCompleted: true }));
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const failSession = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false, isFailed: true }));
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const setWrongAttempts = useCallback((n: number) => {
    setState((prev) => ({ ...prev, wrongAttempts: n }));
  }, []);

  const setHintsUsed = useCallback((n: number) => {
    setState((prev) => ({ ...prev, hintsUsed: n }));
  }, []);

  const resetTimer = useCallback(() => {
    const start = Date.now();
    localStorage.setItem(`mm_timer_${mystery?.id}`, start.toString());
    setState((prev) => ({
      ...prev,
      startedAt: start,
      elapsedSeconds: 0,
    }));
  }, [mystery?.id]);

  const api = useMemo(
    () => ({
      recordWrongAttempt,
      recordHint,
      setWrongAttempts,
      setHintsUsed,
      completeSession,
      failSession,
      resetTimer,
    }),
    [
      recordWrongAttempt,
      recordHint,
      setWrongAttempts,
      setHintsUsed,
      completeSession,
      failSession,
      resetTimer,
    ]
  );

  return { ...state, ...api };
}
