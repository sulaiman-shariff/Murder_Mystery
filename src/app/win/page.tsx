"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMysteryById } from "@/data/mystery-index";
import { useEffect, useState, Suspense } from "react";
import type { Mystery } from "@/types";
import { calculateScore, DEFAULT_SCORING } from "@/lib/game/scoring";

function WinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mystery, setMystery] = useState<Mystery | null>(null);

  const mysteryId = searchParams.get("mysteryId") || "";
  const score = parseInt(searchParams.get("score") || "0");
  const time = parseInt(searchParams.get("time") || "0");
  const nextMysteryId = searchParams.get("nextMysteryId") || null;

  useEffect(() => {
    const m = getMysteryById(mysteryId);
    setMystery(m || null);
  }, [mysteryId]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const breakdown = (() => {
    const timeMinutes = time / 60;
    const timePenalty = Math.floor(timeMinutes * DEFAULT_SCORING.timePenaltyPerMinute);
    const wrongPenalty = 0;
    const hintPenalty = 0;
    const bonus = timeMinutes < DEFAULT_SCORING.speedBonusThresholdMinutes ? DEFAULT_SCORING.speedBonus : 0;
    return { base: DEFAULT_SCORING.baseScore, timePenalty, wrongPenalty, hintPenalty, bonus };
  })();

  if (!mystery) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-5xl">🔍</div>
        <h1 className="mb-2 text-2xl font-bold text-gold">Case Solved!</h1>
        <p className="mb-8 text-sm text-text-secondary">
          {mystery.title}
        </p>

        <div className="mb-8 grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Score
            </p>
            <p className="text-2xl font-bold text-gold">{score}</p>
          </Card>
          <Card className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Time
            </p>
            <p className="text-2xl font-bold text-text-primary">
              {formatTime(time)}
            </p>
          </Card>
        </div>

        <Card className="mb-8 border-accent/30">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">
            Score Breakdown
          </h3>
          <div className="space-y-1 text-xs text-text-secondary">
            <div className="flex justify-between">
              <span>Base score</span>
              <span className="text-text-primary">+{breakdown.base}</span>
            </div>
            <div className="flex justify-between">
              <span>Time penalty</span>
              <span className="text-error">-{breakdown.timePenalty}</span>
            </div>
            {breakdown.wrongPenalty > 0 && (
              <div className="flex justify-between">
                <span>Wrong attempt penalty</span>
                <span className="text-error">-{breakdown.wrongPenalty}</span>
              </div>
            )}
            {breakdown.hintPenalty > 0 && (
              <div className="flex justify-between">
                <span>Hint penalty</span>
                <span className="text-error">-{breakdown.hintPenalty}</span>
              </div>
            )}
            {breakdown.bonus > 0 && (
              <div className="flex justify-between">
                <span>Speed bonus</span>
                <span className="text-gold">+{breakdown.bonus}</span>
              </div>
            )}
            <div className="border-t border-border-dark pt-1 flex justify-between font-bold">
              <span>Final score</span>
              <span className="text-gold">{score}</span>
            </div>
          </div>
        </Card>

        <Card className="mb-8 border-accent/30">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">
            The Solution
          </h3>
          <div className="space-y-3 text-left text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Murderer
              </p>
              <p className="font-bold text-text-primary">
                {mystery.solution.murderer}
              </p>
              <p className="text-xs text-text-secondary">
                {mystery.solution.murdererDescription}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Motive
              </p>
              <p className="text-text-secondary">
                {mystery.solution.motiveSummary}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Explanation
              </p>
              <p className="text-text-secondary leading-relaxed">
                {mystery.solution.explanation}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {nextMysteryId ? (
            <Button
              fullWidth
              className="min-h-[44px]"
              onClick={() =>
                router.push(`/play/${nextMysteryId}`)
              }
            >
              Next Case
            </Button>
          ) : (
            <Card className="border-gold/30 bg-gold/5 text-center">
              <p className="text-sm font-bold text-gold">
                All Mysteries Solved!
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                You have completed every case. You are a master detective.
              </p>
            </Card>
          )}

          <Button
            variant="ghost"
            fullWidth
            onClick={() => router.push("/leaderboard")}
          >
            View Leaderboard
          </Button>

          <Button
            variant="ghost"
            fullWidth
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WinPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-text-muted">Loading...</p></div>}>
      <WinContent />
    </Suspense>
  );
}
