"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrophyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/types";

const REFRESH_MS = 60_000;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const eventCode = process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "";
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch(
        `/api/leaderboard?eventCode=${encodeURIComponent(eventCode)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leaderboard");
      setEntries(data.leaderboard || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the leaderboard."
      );
    } finally {
      setRefreshing(false);
      setInitialLoad(false);
    }
  }, [eventCode]);

  useEffect(() => {
    void loadData();
    timerRef.current = setInterval(() => void loadData(), REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadData]);

  function exportCSV() {
    const header =
      "Rank,Team,Score,Mysteries Completed,Total Time (s),Hints Used,Wrong Attempts";
    const rows = entries.map(
      (e) =>
        `${e.rank},"${e.teamName}",${e.totalScore},${e.mysteriesCompleted},${e.totalTime},${e.hintsUsed},${e.wrongAttempts}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="screen-pad-y flex min-h-dvh flex-col items-center px-4">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center">
          <h1 className="font-display text-2xl uppercase tracking-[0.15em] text-accent">
            Standings
          </h1>
          {eventCode && (
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
              {eventCode}
            </p>
          )}
        </header>

        {error && (
          <Card tone="error" className="mb-4 text-center">
            <p className="text-sm text-error">{error}</p>
          </Card>
        )}

        {initialLoad ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-14" />
                </div>
              </Card>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card className="py-10 text-center">
            <TrophyIcon className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-3 text-sm text-text-secondary">
              No cases closed yet. Solve one and this board fills up.
            </p>
          </Card>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry) => (
              <li key={`${entry.teamName}-${entry.rank}`}>
                <Card tone={entry.rank <= 3 ? "gold" : "default"}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          "font-mono text-sm font-semibold tabular-nums",
                          entry.rank <= 3
                            ? "bg-gold/20 text-gold"
                            : "bg-ink-700 text-text-secondary"
                        )}
                      >
                        {entry.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-base text-text-primary">
                          {entry.teamName}
                        </p>
                        <p className="font-mono text-xs text-text-muted">
                          {entry.mysteriesCompleted} case
                          {entry.mysteriesCompleted === 1 ? "" : "s"} ·{" "}
                          {formatTime(entry.totalTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="flex gap-1.5">
                        <Badge>{entry.hintsUsed} hints</Badge>
                        <Badge>{entry.wrongAttempts} wrong</Badge>
                      </div>
                      <p className="font-mono text-xl font-semibold tabular-nums text-gold">
                        {entry.totalScore}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}

        {lastUpdated && (
          <p className="mt-4 text-center font-mono text-xs text-text-muted">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadData()}
            loading={refreshing}
          >
            Refresh
          </Button>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
          )}
          <Link
            href="/"
            className="flex min-h-11 items-center px-3 font-display text-xs uppercase tracking-[0.15em] text-text-muted transition-colors hover:text-gold"
          >
            Home
          </Link>
        </div>
      </div>
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
