"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stamp } from "@/components/ui/stamp";
import { LoadingScreen } from "@/components/ui/skeleton";
import { CaseSolution } from "@/components/game/case-solution";
import { getMysteryById } from "@/data/mystery-index";
import { readLastResult, type ScoreBreakdown } from "@/lib/game/last-result";
import type { Mystery } from "@/types";

function WinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);

  const mysteryId = searchParams.get("mysteryId") || "";
  const score = parseInt(searchParams.get("score") || "0", 10);
  const time = parseInt(searchParams.get("time") || "0", 10);
  const nextMysteryId = searchParams.get("nextMysteryId");

  useEffect(() => {
    setMystery(getMysteryById(mysteryId) || null);
    setBreakdown(readLastResult(mysteryId)?.breakdown ?? null);
  }, [mysteryId]);

  if (!mystery) {
    return <LoadingScreen label="Closing the file" />;
  }

  return (
    <div className="screen-pad-y flex min-h-dvh flex-col items-center overflow-x-clip px-4">
      <div className="w-full max-w-md lg:max-w-4xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <Stamp tone="gold" slam className="text-sm sm:text-lg">
            Case Closed
          </Stamp>
          <p className="mt-6 font-display text-sm uppercase tracking-[0.15em] text-text-muted">
            {mystery.title}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
              Score
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-gold">
              {score}
            </p>
          </Card>
          <Card className="text-center">
            <p className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
              Time
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-text-primary">
              {formatTime(time)}
            </p>
          </Card>
        </div>

        {breakdown && (
          <Card title="How that adds up">
            <dl className="space-y-1.5 text-sm">
              <Row label="Base score" value={`+${breakdown.base}`} />
              {breakdown.timePenalty > 0 && (
                <Row
                  label="Time"
                  value={`-${breakdown.timePenalty}`}
                  tone="error"
                />
              )}
              {breakdown.wrongPenalty > 0 && (
                <Row
                  label="Wrong accusations"
                  value={`-${breakdown.wrongPenalty}`}
                  tone="error"
                />
              )}
              {breakdown.hintPenalty > 0 && (
                <Row
                  label="Hints"
                  value={`-${breakdown.hintPenalty}`}
                  tone="error"
                />
              )}
              {breakdown.bonus > 0 && (
                <Row
                  label="Speed bonus"
                  value={`+${breakdown.bonus}`}
                  tone="gold"
                />
              )}
              <div className="mt-2 flex justify-between border-t border-border-dark pt-2 font-semibold">
                <dt className="text-text-primary">Final</dt>
                <dd className="font-mono tabular-nums text-gold">
                  {breakdown.total}
                </dd>
              </div>
            </dl>
            {breakdown.total === breakdown.minimumScore && (
              <p className="mt-2 text-xs text-text-muted">
                Held at the minimum score for a solved case.
              </p>
            )}
          </Card>
        )}

        </div>

        <div>
          <CaseSolution mysteryId={mystery.id} />
        </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-md flex-col gap-2">
          {nextMysteryId ? (
            <Button
              fullWidth
              size="lg"
              onClick={() => router.push(`/play/${nextMysteryId}`)}
            >
              Open the next case
            </Button>
          ) : (
            <Card tone="gold" className="text-center">
              <p className="font-display text-base text-gold">
                Every case closed
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                There is nothing left in the archive. Well done.
              </p>
            </Card>
          )}

          <Button
            variant="secondary"
            fullWidth
            onClick={() => router.push("/leaderboard")}
          >
            View leaderboard
          </Button>
          <Button variant="ghost" fullWidth onClick={() => router.push("/")}>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "error" | "gold";
}) {
  const toneClass =
    tone === "error"
      ? "text-error"
      : tone === "gold"
        ? "text-gold"
        : "text-text-primary";
  return (
    <div className="flex justify-between">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={`font-mono tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest
    .toString()
    .padStart(2, "0")}`;
}

export default function WinPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Closing the file" />}>
      <WinContent />
    </Suspense>
  );
}
