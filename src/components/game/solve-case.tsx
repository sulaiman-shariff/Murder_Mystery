"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateScore, DEFAULT_SCORING } from "@/lib/game/scoring";
import { markCompleted, getNextMysteryId, getTeam } from "@/lib/storage/local";
import type { Mystery, ValidationStatus, MurdererValidationResult, MotiveValidationResult } from "@/types";

interface SolveCaseProps {
  mystery: Mystery;
  elapsedSeconds: number;
  wrongAttempts: number;
  hintsUsed: number;
  maxAttempts: number;
  onComplete: (score: number, nextMysteryId: string | null) => void;
  onFail: () => void;
  onWrongAttempt: () => void;
  onClose: () => void;
}

export function SolveCase({
  mystery,
  elapsedSeconds,
  wrongAttempts,
  hintsUsed,
  maxAttempts,
  onComplete,
  onFail,
  onWrongAttempt,
  onClose,
}: SolveCaseProps) {
  const [murdererGuess, setMurdererGuess] = useState("");
  const [motiveGuess, setMotiveGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"error" | "retry" | "success">("error");
  const [murdererResult, setMurdererResult] = useState<{
    status: ValidationStatus;
  } | null>(null);
  const [motiveResult, setMotiveResult] = useState<{
    status: ValidationStatus;
  } | null>(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarifyingPart, setClarifyingPart] = useState<
    "murderer" | "motive" | null
  >(null);
  const [completionFailed, setCompletionFailed] = useState(false);

  const murdererRef = useRef<HTMLTextAreaElement>(null);
  const motiveRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const wrongCountRef = useRef(wrongAttempts);
  wrongCountRef.current = wrongAttempts;

  const remainingAttempts = maxAttempts - wrongAttempts;

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFeedback(null);
    setNeedsClarification(false);
    setClarifyingPart(null);
    setCompletionFailed(false);

    try {
      if (clarifyingPart === "murderer") {
        const mRes = await validateMurderer(murdererGuess);
        setMurdererResult({ status: mRes.status });
        if (mRes.status === "unavailable") {
          setFeedbackType("retry");
          setFeedback("Validation service is unavailable. Please try again in a moment.");
          return;
        }
        if (mRes.status === "ambiguous") {
          setNeedsClarification(true);
          setClarifyingPart("murderer");
          setFeedback("Your answer is a bit ambiguous. Could you be more specific about who you're referring to?");
          return;
        }
        if (mRes.status === "incorrect") {
          recordAttempt();
          setFeedback(mRes.feedback);
          setClarifyingPart(null);
          return;
        }
        setClarifyingPart("motive");
        setFeedback("Good, the murderer is correct! Now let's refine your motive.");
        return;
      }

      if (clarifyingPart === "motive") {
        const motRes = await validateMotive(motiveGuess);
        setMotiveResult({ status: motRes.status });
        if (motRes.status === "unavailable") {
          setFeedbackType("retry");
          setFeedback("Validation service is unavailable. Please try again in a moment.");
          return;
        }
        if (motRes.status === "incorrect" || motRes.status === "ambiguous") {
          recordAttempt();
          setFeedback(motRes.feedback);
          setClarifyingPart(null);
          return;
        }
        handleSuccess();
        return;
      }

      const [mRes, motRes] = await Promise.all([
        validateMurderer(murdererGuess),
        validateMotive(motiveGuess),
      ]);

      setMurdererResult({ status: mRes.status });
      setMotiveResult({ status: motRes.status });

      if (mRes.status === "unavailable" || motRes.status === "unavailable") {
        setFeedbackType("retry");
        setFeedback("Validation service is unavailable. Please try again in a moment.");
        return;
      }

      if (mRes.status === "ambiguous" || motRes.status === "ambiguous") {
        setNeedsClarification(true);
        setClarifyingPart(mRes.status === "ambiguous" ? "murderer" : "motive");
        setFeedback(
          mRes.status === "ambiguous"
            ? "Your suspect answer could refer to multiple people. Could you be more specific?"
            : "Your motive needs more detail. What was the core reason for the murder?"
        );
        return;
      }

      if (mRes.status === "correct" && motRes.status === "correct") {
        handleSuccess();
        return;
      }

      recordAttempt();

      if (mRes.status === "incorrect" && motRes.status === "incorrect") {
        setFeedback(
          `Neither the suspect nor the motive is correct. ${mRes.feedback}`
        );
      } else if (mRes.status === "incorrect") {
        setFeedback(mRes.feedback);
      } else {
        setFeedback(motRes.feedback);
      }
    } catch {
      setFeedbackType("retry");
      setFeedback("There was an error validating your answer. Please try again.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  const teamId = typeof window !== "undefined" ? getTeam()?.id : undefined;

  async function validateMurderer(
    guess: string
  ): Promise<Pick<MurdererValidationResult, "status" | "feedback">> {
    const res = await fetch("/api/ai/validate-murderer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess, mysteryId: mystery.id, sessionId: teamId ? `${teamId}_${mystery.id}` : undefined }),
    });
    const data = await res.json();
    return {
      status: data.status || (data.correct ? "correct" : data.ambiguous ? "ambiguous" : "incorrect"),
      feedback: data.feedback,
    };
  }

  async function validateMotive(
    guess: string
  ): Promise<Pick<MotiveValidationResult, "status" | "feedback">> {
    const res = await fetch("/api/ai/validate-motive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess, mysteryId: mystery.id, sessionId: teamId ? `${teamId}_${mystery.id}` : undefined }),
    });
    const data = await res.json();
    return {
      status: data.status || (data.correct ? "correct" : data.ambiguous ? "ambiguous" : "incorrect"),
      feedback: data.feedback,
    };
  }

  function recordAttempt() {
    const next = wrongCountRef.current + 1;
    onWrongAttempt();
    if (next >= maxAttempts) {
      const team = getTeam();
      if (team?.id) {
        saveToSupabase(team.id, "failed", 0, next);
      }
      onFail();
    }
  }

  async function saveToSupabase(teamId: string, status: string, finalScore: number, finalAttempts?: number): Promise<boolean> {
    try {
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          mysteryId: mystery.id,
          status,
          score: finalScore,
          wrongAttempts: finalAttempts ?? wrongAttempts,
          hintsUsed,
          elapsedSeconds,
        }),
      });
      return res.ok;
    } catch {
      return false;
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
      const saved = await saveToSupabase(team.id, "completed", finalScore.score);
      if (!saved) {
        setCompletionFailed(true);
        setFeedbackType("retry");
        setFeedback("Failed to save your result. Please try again — your score will be preserved.");
        setClarifyingPart(null);
        setNeedsClarification(false);
        return;
      }
    }

    onComplete(finalScore.score, nextId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Submit your answer">
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
                disabled={submitting || !!murdererResult?.status}
                style={{ fontSize: "16px" }}
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
                disabled={submitting || !!motiveResult?.status}
                style={{ fontSize: "16px" }}
              />
            </div>

            {needsClarification && clarifyingPart && (
              <Card className="border-warning/30 bg-warning/5">
                <p className="text-xs text-warning">{feedback}</p>
              </Card>
            )}

            {feedback && !needsClarification && (
              <Card className={feedbackType === "retry" ? "border-gold/30 bg-gold/5" : "border-accent/30 bg-accent/5"}>
                <p className="text-xs text-text-secondary">{feedback}</p>
              </Card>
            )}

            {completionFailed && (
              <Button
                type="submit"
                variant="secondary"
                fullWidth
              >
                Retry Saving Result
              </Button>
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
              className="min-h-[44px]"
            >
              {completionFailed
                ? "Retry Saving"
                : needsClarification
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
