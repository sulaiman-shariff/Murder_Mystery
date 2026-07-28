"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTeam } from "@/lib/storage/local";
import type { Mystery } from "@/types";

interface HintPanelProps {
  mystery: Mystery;
  currentLevel: number;
  onHintUsed: () => void;
  onClose: () => void;
}

export function HintPanel({
  mystery,
  currentLevel,
  onHintUsed,
  onClose,
}: HintPanelProps) {
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(currentLevel);

  const hasMoreHints = level <= (mystery.hintPlan?.length || 0);

  async function requestHint() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mysteryId: mystery.id, level, sessionId: getTeam()?.id ? `${getTeam()!.id}_${mystery.id}` : undefined }),
      });
      const data = await res.json();
      setHint(data.hint);
      setLevel((prev) => prev + 1);
      onHintUsed();
    } catch {
      setHint("Unable to generate a hint right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 sm:items-center sm:justify-center">
      <div className="bottom-sheet flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-dark-900 sm:mx-4 sm:max-w-md sm:rounded-2xl border border-border-dark">
        <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold">
            Hint
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {hint ? (
            <Card>
              <p className="text-sm leading-relaxed text-text-secondary">
                {hint}
              </p>
            </Card>
          ) : (
            <Card className="text-center">
              <p className="text-sm text-text-muted">
                Request a hint to guide your investigation. Hints become more
                specific as you progress.
              </p>
            </Card>
          )}

          {hasMoreHints && (
            <Button
              className="mt-4"
              fullWidth
              onClick={requestHint}
              loading={loading}
            >
              {hint ? "Next Hint" : "Request Hint"}
            </Button>
          )}

          {!hasMoreHints && (
            <p className="mt-4 text-center text-xs text-text-muted">
              No more hints available. Trust your instincts!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
