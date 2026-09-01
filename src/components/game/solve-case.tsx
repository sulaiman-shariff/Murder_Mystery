"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/input";
import { calculateScore, DEFAULT_SCORING } from "@/lib/game/scoring";
import type { ScoreBreakdown } from "@/lib/game/last-result";
import { markCompleted, getNextMysteryId, getTeam } from "@/lib/storage/local";
import type {
  Mystery,
  ScoringSettings,
  ValidationStatus,
  MurdererValidationResult,
  MotiveValidationResult,
} from "@/types";

export interface SolveResult {
  score: number;
  nextMysteryId: string | null;
  breakdown?: ScoreBreakdown;
}

interface SolveCaseProps {
  mystery: Mystery;
  elapsedSeconds: number;
  wrongAttempts: number;
  hintsUsed: number;
  maxAttempts: number;
  scoring?: ScoringSettings;
  onComplete: (result: SolveResult) => void;
  onFail: () => void;
  onWrongAttempt: () => void;
  onClose: () => void;
}

type FeedbackTone = "error" | "retry" | "warning";

export function SolveCase({
  mystery,
  elapsedSeconds,
  wrongAttempts,
  hintsUsed,
  maxAttempts,
  scoring = DEFAULT_SCORING,
  onComplete,
  onFail,
  onWrongAttempt,
  onClose,
}: SolveCaseProps) {
  const [murdererGuess, setMurdererGuess] = useState("");
  const [motiveGuess, setMotiveGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("error");
  const [murdererStatus, setMurdererStatus] = useState<ValidationStatus | null>(
    null
  );
  const [motiveStatus, setMotiveStatus] = useState<ValidationStatus | null>(
    null
  );
  const [clarifyingPart, setClarifyingPart] = useState<
    "murderer" | "motive" | null
  >(null);
  const [completionFailed, setCompletionFailed] = useState(false);

  const submittingRef = useRef(false);
  const wrongCountRef = useRef(wrongAttempts);
  wrongCountRef.current = wrongAttempts;

  const remainingAttempts = maxAttempts - wrongAttempts;
  const teamId = typeof window !== "undefined" ? getTeam()?.id : undefined;

  const projectedScore = Math.max(
    0,
    calculateScore(
      { elapsedSeconds, wrongAttempts, hintsUsed, completed: true },
      scoring
    ).score
  );

  useEffect(() => {
    const savedMurderer = localStorage.getItem(`mm_draft_murderer_${mystery.id}`);
    const savedMotive = localStorage.getItem(`mm_draft_motive_${mystery.id}`);
    if (savedMurderer) setMurdererGuess(savedMurderer);
    if (savedMotive) setMotiveGuess(savedMotive);
  }, [mystery.id]);

  useEffect(() => {
    localStorage.setItem(`mm_draft_murderer_${mystery.id}`, murdererGuess);
  }, [murdererGuess, mystery.id]);

  useEffect(() => {
    localStorage.setItem(`mm_draft_motive_${mystery.id}`, motiveGuess);
  }, [motiveGuess, mystery.id]);

  async function validate(
    kind: "murderer" | "motive",
    guess: string
  ): Promise<Pick<MurdererValidationResult & MotiveValidationResult, "status" | "feedback">> {
    const res = await fetch(`/api/ai/validate-${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guess,
        mysteryId: mystery.id,
        sessionId: teamId ? `${teamId}_${mystery.id}` : undefined,
      }),
    });
    const data = await res.json();
    return {
      status:
        data.status ||
        (data.correct ? "correct" : data.ambiguous ? "ambiguous" : "incorrect"),
      feedback: data.feedback,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFeedback(null);
    setCompletionFailed(false);

    try {
      if (clarifyingPart === "murderer") {
        const result = await validate("murderer", murdererGuess);
        setMurdererStatus(result.status);
        if (handleUnavailable(result.status)) return;

        if (result.status === "ambiguous") {
          setFeedbackTone("warning");
          setClarifyingPart("murderer");
          setFeedback(
            "That could point at more than one person. Name them more precisely."
          );
          return;
        }
        if (result.status === "incorrect") {
          recordAttempt();
          setFeedbackTone("error");
          setFeedback(result.feedback);
          setClarifyingPart(null);
          return;
        }
        setFeedbackTone("warning");
        setClarifyingPart("motive");
        setFeedback("The suspect is right. Now sharpen the motive.");
        return;
      }

      if (clarifyingPart === "motive") {
        const result = await validate("motive", motiveGuess);
        setMotiveStatus(result.status);
        if (handleUnavailable(result.status)) return;

        if (result.status === "incorrect" || result.status === "ambiguous") {
          recordAttempt();
          setFeedbackTone("error");
          setFeedback(result.feedback);
          setClarifyingPart(null);
          return;
        }
        await handleSuccess();
        return;
      }

      const [murderer, motive] = await Promise.all([
        validate("murderer", murdererGuess),
        validate("motive", motiveGuess),
      ]);

      setMurdererStatus(murderer.status);
      setMotiveStatus(motive.status);

      if (handleUnavailable(murderer.status) || handleUnavailable(motive.status)) {
        return;
      }

      if (murderer.status === "ambiguous" || motive.status === "ambiguous") {
        setFeedbackTone("warning");
        setClarifyingPart(
          murderer.status === "ambiguous" ? "murderer" : "motive"
        );
        setFeedback(
          murderer.status === "ambiguous"
            ? "That could point at more than one person. Name them more precisely."
            : "The motive needs more detail. What was the core reason for the killing?"
        );
        return;
      }

      if (murderer.status === "correct" && motive.status === "correct") {
        await handleSuccess();
        return;
      }

      recordAttempt();
      setFeedbackTone("error");
      if (murderer.status === "incorrect" && motive.status === "incorrect") {
        setFeedback(`Neither the suspect nor the motive holds up. ${murderer.feedback}`);
      } else if (murderer.status === "incorrect") {
        setFeedback(murderer.feedback);
      } else {
        setFeedback(motive.feedback);
      }
    } catch {
      setFeedbackTone("retry");
      setFeedback("The answer could not be checked. Nothing was counted against you — try again.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  function handleUnavailable(status: ValidationStatus): boolean {
    if (status !== "unavailable") return false;
    setFeedbackTone("retry");
    setFeedback(
      "The validation service is not responding. Nothing was counted against you — try again in a moment."
    );
    return true;
  }

  function recordAttempt() {
    const next = wrongCountRef.current + 1;
    onWrongAttempt();
    if (next >= maxAttempts) {
      const team = getTeam();
      if (team?.id) void saveSession(team.id, "failed", next);
      onFail();
    }
  }

  async function saveSession(
    id: string,
    status: "completed" | "failed",
    finalAttempts?: number
  ) {
    const res = await fetch("/api/sessions/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: id,
        mysteryId: mystery.id,
        status,
        wrongAttempts: finalAttempts ?? wrongAttempts,
        hintsUsed,
        elapsedSeconds,
      }),
    });
    if (!res.ok) throw new Error("Save failed");
    return res.json();
  }

  async function handleSuccess() {
    const nextId = getNextMysteryId(mystery.id);
    const team = getTeam();

    // No team means no server session (local play); fall back to the local
    // calculation. Otherwise the server's score is authoritative.
    if (!team?.id) {
      const local = calculateScore(
        { elapsedSeconds, wrongAttempts, hintsUsed, completed: true },
        scoring
      );
      markCompleted(mystery.id, local.score);
      onComplete({ score: local.score, nextMysteryId: nextId });
      return;
    }

    try {
      const data = await saveSession(team.id, "completed");
      markCompleted(mystery.id, data.score);
      onComplete({
        score: data.score,
        nextMysteryId: data.nextMysteryId ?? nextId,
        breakdown: data.breakdown,
      });
    } catch {
      setCompletionFailed(true);
      setFeedbackTone("retry");
      setFeedback(
        "You solved it, but the result did not save. Press again to retry — your answer is kept."
      );
      setClarifyingPart(null);
    }
  }

  const feedbackTones = {
    error: "error",
    retry: "gold",
    warning: "gold",
  } as const;

  return (
    <Sheet
      title="Name the killer"
      meta={`${remainingAttempts} left`}
      onClose={onClose}
      footer={
        <Button
          type="submit"
          form="solve-form"
          fullWidth
          size="lg"
          loading={submitting}
          disabled={
            !murdererGuess.trim() ||
            !motiveGuess.trim() ||
            remainingAttempts <= 0
          }
        >
          {completionFailed
            ? "Retry saving"
            : clarifyingPart
              ? "Submit clarification"
              : submitting
                ? "Checking…"
                : "Submit answer"}
        </Button>
      }
    >
      <div className="mb-4 flex items-center justify-between rounded border border-border-dark bg-ink-800 px-3 py-2.5">
        <span className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
          Score if correct
        </span>
        <span className="font-mono text-xl font-semibold tabular-nums text-gold">
          {projectedScore}
        </span>
      </div>

      <form id="solve-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Textarea
          label="Who did it?"
          value={murdererGuess}
          onChange={(e) => setMurdererGuess(e.target.value)}
          placeholder="A name, a title, or a description"
          rows={2}
          maxLength={300}
          disabled={submitting || murdererStatus === "correct"}
        />

        <Textarea
          label="Why did they do it?"
          value={motiveGuess}
          onChange={(e) => setMotiveGuess(e.target.value)}
          placeholder="The reason behind the killing"
          rows={4}
          maxLength={500}
          disabled={submitting || motiveStatus === "correct"}
        />

        {feedback && (
          <Card tone={feedbackTones[feedbackTone]} className="animate-rise">
            <p role="status" className="text-sm leading-relaxed text-text-secondary">
              {feedback}
            </p>
          </Card>
        )}
      </form>
    </Sheet>
  );
}
