"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
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
  const latestHintRef = useRef<HTMLDivElement>(null);

  const nextLevel = hintsUsed + 1;
  const hasMoreHints = nextLevel <= mystery.hintCount;

  // A hint appended below the fold is a hint the player never sees.
  useEffect(() => {
    if (hints.length > 0) {
      latestHintRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [hints.length]);

  async function requestHint() {
    setLoading(true);
    try {
      const team = getTeam();
      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mysteryId: mystery.id,
          level: nextLevel,
          sessionId: team?.id ? `${team.id}_${mystery.id}` : undefined,
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
        setHints((prev) => [
          ...prev,
          {
            level: nextLevel,
            text: "The detective could not put a hint together. Try again in a moment.",
          },
        ]);
      }
    } catch {
      setHints((prev) => [
        ...prev,
        {
          level: nextLevel,
          text: "The detective could not be reached. Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      title="Hints"
      tone="gold"
      meta={`${hintsUsed}/${mystery.hintCount} used`}
      onClose={onClose}
      footer={
        hasMoreHints ? (
          <Button variant="gold" fullWidth size="lg" onClick={requestHint} loading={loading}>
            {loading
              ? "Consulting the file…"
              : `Request hint ${nextLevel} of ${mystery.hintCount}`}
          </Button>
        ) : (
          <p className="text-center text-sm text-text-muted">
            That is every hint in the file. Trust what you have.
          </p>
        )
      }
    >
      <div className="space-y-3">
        {hints.length === 0 && !loading && (
          <Card className="text-center">
            <p className="text-sm leading-relaxed text-text-muted">
              Hints narrow the field, and each one gets more specific than the
              last. Every hint you take costs points.
            </p>
          </Card>
        )}

        {hints.map((hint, index) => (
          <div
            key={`${hint.level}-${index}`}
            ref={index === hints.length - 1 ? latestHintRef : undefined}
          >
            <Card
              tone="gold"
              title={`Hint ${hint.level}`}
              className="animate-rise"
            >
              <p className="text-[15px] leading-relaxed text-text-secondary">
                {hint.text}
              </p>
            </Card>
          </div>
        ))}

        {loading && (
          <Card>
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink-500 border-t-gold" />
              <p className="text-sm text-text-muted">
                The detective is reading the file…
              </p>
            </div>
          </Card>
        )}
      </div>
    </Sheet>
  );
}
