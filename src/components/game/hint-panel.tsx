"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTeam } from "@/lib/storage/local";
import type { Mystery } from "@/types";

interface HintPanelProps {
  mystery: Mystery;
  hintsUsed: number;
  onHintUsed: () => void;
  onClose: () => void;
}

export function HintPanel({
  mystery,
  hintsUsed,
  onHintUsed,
  onClose,
}: HintPanelProps) {
  const [hints, setHints] = useState<{ level: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const hasAppliedAnyPenalty = useRef(false);

  const nextLevel = hintsUsed + 1;
  const hasMoreHints = nextLevel <= (mystery.hintPlan?.length || 0);

  async function requestHint() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mysteryId: mystery.id,
          level: nextLevel,
          sessionId: getTeam()?.id ? `${getTeam()!.id}_${mystery.id}` : undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.hint) {
        setHints((prev) => [...prev, { level: data.level, text: data.hint }]);
        if (!hasAppliedAnyPenalty.current && data.penaltyApplied) {
          hasAppliedAnyPenalty.current = true;
          onHintUsed();
        }
      } else if (data.reason === "unavailable") {
        setHints((prev) => [...prev, { level: nextLevel, text: "Hint generation unavailable. Please try again." }]);
      }
      // no_more_hints = silent, button already hidden
    } catch {
      setHints((prev) => [...prev, { level: nextLevel, text: "Unable to generate a hint right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Hints">
      <div className="bottom-sheet flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-dark-900 sm:mx-4 sm:max-w-md sm:rounded-2xl border border-border-dark">
        <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">
            Hints
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {hints.length === 0 ? (
            <Card className="text-center">
              <p className="text-sm text-text-muted">
                Request a hint to guide your investigation. Hints become more
                specific as you progress. Each hint costs points.
              </p>
            </Card>
          ) : (
            hints.map((h, i) => (
              <Card key={i}>
                <p className="text-[10px] uppercase tracking-wider text-gold mb-1">
                  Hint {h.level}
                </p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {h.text}
                </p>
              </Card>
            ))
          )}

          {hasMoreHints && (
            <Button
              fullWidth
              onClick={requestHint}
              loading={loading}
              className="min-h-[44px]"
            >
              {hints.length > 0 ? `Hint ${nextLevel} (${hints.length + 1}/${mystery.hintPlan.length})` : "Request Hint"}
            </Button>
          )}

          {!hasMoreHints && (
            <p className="text-center text-xs text-text-muted">
              No more hints available. Trust your instincts!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
