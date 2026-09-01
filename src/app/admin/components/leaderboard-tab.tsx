"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatTime } from "../lib";
import type { LeaderboardEntry } from "@/types";

export function LeaderboardTab({
  entries,
  onRefresh,
  onExport,
  loading,
}: {
  entries: LeaderboardEntry[];
  onRefresh: () => void;
  onExport: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-display text-xs uppercase tracking-[0.15em] text-text-secondary">
          {entries.length} ranked
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onRefresh} loading={loading}>
            Refresh
          </Button>
          {entries.length > 0 && (
            <Button size="sm" variant="ghost" onClick={onExport}>
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-sm text-text-muted">
            No scores yet. The board fills as teams close cases.
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
    </div>
  );
}
