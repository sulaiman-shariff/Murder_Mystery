"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/input";
import { ProofPicker } from "@/components/game/proof-picker";
import type { ScoreBreakdown } from "@/lib/game/last-result";
import { markCompleted, getTeam } from "@/lib/storage/local";
import type { Mystery } from "@/types";

export interface SolveResult {
  score: number;
  nextMysteryId: string | null;
  breakdown?: ScoreBreakdown;
  bonuses?: { proof: number; alibi: number; board: number; interrogation: number; total: number };
}

interface SolveCaseProps {
  mystery: Mystery;
  maxAttempts: number;
  wrongAttempts: number;
  maxSelections: number;
  importantEvidence: string[];
  stage: number;
  onComplete: (result: SolveResult) => void;
  onFail: () => void;
  onRejected: (wrongAttempts: number) => void;
  onClose: () => void;
}

export function SolveCase({
  mystery,
  maxAttempts,
  wrongAttempts,
  maxSelections,
  importantEvidence,
  stage,
  onComplete,
  onFail,
  onRejected,
  onClose,
}: SolveCaseProps) {
  const [murdererGuess, setMurdererGuess] = useState("");
  const [motiveGuess, setMotiveGuess] = useState("");
  const [proof, setProof] = useState<string[]>(() =>
    importantEvidence.slice(0, maxSelections)
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const submittingRef = useRef(false);

  const remainingAttempts = maxAttempts - wrongAttempts;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFeedback([]);

    try {
      // One request grades all three parts and owns the attempt counter, so a
      // single accusation can never cost more than one attempt.
      const res = await fetch("/api/accuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: getTeam()?.id,
          mysteryId: mystery.id,
          murdererGuess,
          motiveGuess,
          evidenceIds: proof,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback([data.error || "That could not be checked. Try again."]);
        return;
      }

      if (data.verdict === "unavailable") {
        setFeedback([data.message]);
        return;
      }

      if (data.verdict === "solved") {
        markCompleted(mystery.id, data.score);
        onComplete({
          score: data.score,
          nextMysteryId: data.nextMysteryId ?? null,
          breakdown: data.breakdown,
          bonuses: data.bonuses,
        });
        return;
      }

      if (data.verdict === "failed") {
        onFail();
        return;
      }

      const notes = [
        data.feedback?.murderer,
        data.feedback?.motive,
        data.feedback?.proof,
      ].filter((n: unknown): n is string => typeof n === "string" && !!n);

      setFeedback(notes.length ? notes : ["That is not it. Keep going."]);
      onRejected(data.wrongAttempts);
    } catch {
      setFeedback([
        "The accusation could not be sent. Nothing was counted against you — try again.",
      ]);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  const canSubmit =
    !!murdererGuess.trim() && !!motiveGuess.trim() && proof.length > 0;

  return (
    <Sheet
      title="Make your accusation"
      meta={`${remainingAttempts} left`}
      onClose={onClose}
      footer={
        <Button
          type="submit"
          form="solve-form"
          fullWidth
          size="lg"
          loading={submitting}
          disabled={!canSubmit || remainingAttempts <= 0}
        >
          {submitting ? "Putting it to them…" : "Accuse"}
        </Button>
      }
    >
      <form id="solve-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Textarea
          label="Who did it?"
          value={murdererGuess}
          onChange={(e) => setMurdererGuess(e.target.value)}
          placeholder="A name, or how you'd describe them"
          rows={2}
          maxLength={300}
          disabled={submitting}
        />

        <Textarea
          label="Why did they do it?"
          value={motiveGuess}
          onChange={(e) => setMotiveGuess(e.target.value)}
          placeholder="In your own words — plainly is fine"
          rows={4}
          maxLength={500}
          disabled={submitting}
        />

        <ProofPicker
          mystery={mystery}
          stage={stage}
          selected={proof}
          onChange={setProof}
          maxSelections={maxSelections}
          disabled={submitting}
        />

        {feedback.length > 0 && (
          <Card tone="error" className="animate-rise">
            <ul className="space-y-2">
              {feedback.map((note, index) => (
                <li
                  key={index}
                  role="status"
                  className="text-sm leading-relaxed text-text-secondary"
                >
                  {note}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </form>
    </Sheet>
  );
}
