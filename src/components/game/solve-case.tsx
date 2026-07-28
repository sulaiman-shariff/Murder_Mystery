"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateScore, DEFAULT_SCORING } from "@/lib/game/scoring";
import { markCompleted, getNextMysteryId, getTeam } from "@/lib/storage/local";
import type { Mystery } from "@/types";

interface SolveCaseProps {
  mystery: Mystery;
  elapsedSeconds: number;
  wrongAttempts: number;
  hintsUsed: number;
  onComplete: (score: number, nextMysteryId: string | null) => void;
  onFail: () => void;
  onWrongAttempt: () => void;
  onClose: () => void;
}

const MAX_ATTEMPTS = 10;

export function SolveCase({
  mystery,
  elapsedSeconds,
  wrongAttempts,
  hintsUsed,
  onComplete,
  onFail,
  onWrongAttempt,
  onClose,
}: SolveCaseProps) {
  const [murdererGuess, setMurdererGuess] = useState("");
  const [motiveGuess, setMotiveGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [murdererResult, setMurdererResult] = useState<{
    correct: boolean;
    ambiguous: boolean;
  } | null>(null);
  const [motiveResult, setMotiveResult] = useState<{
    correct: boolean;
  } | null>(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarifyingPart, setClarifyingPart] = useState<
    "murderer" | "motive" | null
  >(null);

  const murdererRef = useRef<HTMLTextAreaElement>(null);
  const motiveRef = useRef<HTMLTextAreaElement>(null);
  const wrongAttemptsRef = useRef(wrongAttempts);
  wrongAttemptsRef.current = wrongAttempts;

  const remainingAttempts = MAX_ATTEMPTS - wrongAttempts;
  const currentScore = calculateScore(
    { elapsedSeconds, wrongAttempts, hintsUsed, completed: false },
    DEFAULT_SCORING
  );

  useEffect(() => {
    const savedMurderer = localStorage.getItem(
      `mm_draft_murderer_${mystery.id}`
    );
    const savedMotive = localStorage.getItem(
      `mm_draft_motive_${mystery.id}`
    );
    if (savedMurderer) setMurdererGuess(savedMurderer);
    if (savedMotive) setMotiveGuess(savedMotive);
  }, [mystery.id]);

  useEffect(() => {
    localStorage.setItem(`mm_draft_murderer_${mystery.id}`, murdererGuess);
  }, [murdererGuess, mystery.id]);

  useEffect(() => {
    localStorage.setItem(`mm_draft_motive_${mystery.id}`, motiveGuess);
  }, [motiveGuess, mystery.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    setNeedsClarification(false);
    setClarifyingPart(null);

    try {
      if (clarifyingPart === "murderer") {
        const mRes = await validateMurderer(murdererGuess);
        setMurdererResult(mRes);
        if (mRes.ambiguous) {
          setNeedsClarification(true);
          setClarifyingPart("murderer");
          setFeedback(
            "Your answer is a bit ambiguous. Could you be more specific about who you're referring to?"
          );
          return;
        }
        if (!mRes.correct) {
          onWrongAttempt();
          setFeedback(mRes.feedback);
          setClarifyingPart(null);
          checkFail();
          return;
        }
        setClarifyingPart("motive");
        setFeedback("Good, the murderer is correct! Now let's refine your motive.");
        return;
      }

      if (clarifyingPart === "motive") {
        const motRes = await validateMotive(motiveGuess);
        setMotiveResult(motRes);
        if (!motRes.correct) {
          onWrongAttempt();
          setFeedback(motRes.feedback);
          setClarifyingPart(null);
          checkFail();
          return;
        }
        handleSuccess();
        return;
      }

      // Full submission
      const [mRes, motRes] = await Promise.all([
        validateMurderer(murdererGuess),
        validateMotive(motiveGuess),
      ]);

      setMurdererResult(mRes);
      setMotiveResult(motRes);

      if (mRes.ambiguous || motRes.correct === undefined) {
        setNeedsClarification(true);
        setClarifyingPart(mRes.ambiguous ? "murderer" : "motive");
        setFeedback(
          mRes.ambiguous
            ? "Your suspect answer could refer to multiple people. Could you be more specific?"
            : "Your motive needs more detail. What was the core reason for the murder?"
        );
        return;
      }

      if (mRes.correct && motRes.correct) {
        handleSuccess();
        return;
      }

      onWrongAttempt();

      if (!mRes.correct && !motRes.correct) {
        setFeedback(
          `Neither the suspect nor the motive is correct. ${mRes.feedback}`
        );
      } else if (!mRes.correct) {
        setFeedback(mRes.feedback);
      } else {
        setFeedback(motRes.feedback);
      }

      checkFail();
    } catch (err) {
      setFeedback(
        "There was an error validating your answer. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const teamId = typeof window !== "undefined" ? getTeam()?.id : undefined;

  async function validateMurderer(
    guess: string
  ): Promise<{ correct: boolean; ambiguous: boolean; feedback: string }> {
    const res = await fetch("/api/ai/validate-murderer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess, mysteryId: mystery.id, sessionId: teamId ? `${teamId}_${mystery.id}` : undefined }),
    });
    const data = await res.json();
    return {
      correct: data.correct,
      ambiguous: data.ambiguous,
      feedback: data.feedback,
    };
  }

  async function validateMotive(
    guess: string
  ): Promise<{ correct: boolean; feedback: string }> {
    const res = await fetch("/api/ai/validate-motive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess, mysteryId: mystery.id, sessionId: teamId ? `${teamId}_${mystery.id}` : undefined }),
    });
    const data = await res.json();
    return {
      correct: data.correct,
      feedback: data.feedback,
    };
  }

  async function saveToSupabase(teamId: string, status: string, finalScore: number) {
    try {
      await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          mysteryId: mystery.id,
          status,
          score: finalScore,
          wrongAttempts,
          hintsUsed,
          elapsedSeconds,
        }),
      });
    } catch {
      // non-blocking after attempting
    }
  }

  async function handleSuccess() {
    const finalScore = calculateScore(
      { elapsedSeconds, wrongAttempts, hintsUsed, completed: true },
      DEFAULT_SCORING
    );
    markCompleted(mystery.id, finalScore.score);
    const nextId = getNextMysteryId(mystery.id);

    const team = getTeam();
    if (team?.id) {
      await saveToSupabase(team.id, "completed", finalScore.score);
    }

    onComplete(finalScore.score, nextId);
  }

  function checkFail() {
    const current = wrongAttemptsRef.current;
    if (current >= MAX_ATTEMPTS) {
      const team = getTeam();
      if (team?.id) {
        saveToSupabase(team.id, "failed", 0);
      }
      onFail();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 sm:items-center sm:justify-center">
      <div className="bottom-sheet flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-dark-900 sm:mx-4 sm:max-w-md sm:rounded-2xl border border-border-dark">
        <div className="sticky top-0 flex items-center justify-between border-b border-border-dark bg-dark-900 px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent">
            Submit Your Answer
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              Attempts: {remainingAttempts}
            </span>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 rounded bg-dark-800 p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Current Score if Correct
            </p>
            <p className="text-xl font-bold text-gold">
              {Math.max(
                0,
                calculateScore(
                  { elapsedSeconds, wrongAttempts, hintsUsed, completed: true },
                  DEFAULT_SCORING
                ).score
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                Who committed the murder?
              </label>
              <textarea
                ref={murdererRef}
                value={murdererGuess}
                onChange={(e) => setMurdererGuess(e.target.value)}
                placeholder="Enter name, title, or description..."
                className="w-full rounded border border-border-dark bg-dark-800 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-[60px] resize-none"
                disabled={submitting || !!murdererResult?.correct}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                What was their motive?
              </label>
              <textarea
                ref={motiveRef}
                value={motiveGuess}
                onChange={(e) => setMotiveGuess(e.target.value)}
                placeholder="Explain the reason behind the murder..."
                className="w-full rounded border border-border-dark bg-dark-800 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-[100px] resize-none"
                disabled={submitting || !!motiveResult?.correct}
              />
            </div>

            {needsClarification && clarifyingPart && (
              <Card className="border-warning/30 bg-warning/5">
                <p className="text-xs text-warning">{feedback}</p>
              </Card>
            )}

            {feedback && !needsClarification && (
              <Card className="border-accent/30 bg-accent/5">
                <p className="text-xs text-text-secondary">{feedback}</p>
              </Card>
            )}

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={
                !murdererGuess.trim() ||
                !motiveGuess.trim() ||
                remainingAttempts <= 0
              }
            >
              {needsClarification
                ? "Submit Clarification"
                : submitting
                ? "Analyzing..."
                : "Submit Answer"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
