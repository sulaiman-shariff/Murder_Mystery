"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DEFAULT_EVENT_ID = "d431c5d2-a078-42fe-addc-4483145692d1";

interface Entry {
  rank: number;
  teamName: string;
  totalScore: number;
  mysteriesCompleted: number;
  totalTime: number;
  hintsUsed: number;
  wrongAttempts: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?eventId=${DEFAULT_EVENT_ID}`);
      const data = await res.json();
      setEntries(data.leaderboard || []);
      setLastUpdated(data.lastUpdated);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <h1 className="mb-6 text-center text-lg font-bold uppercase tracking-wider text-accent">
          Leaderboard
        </h1>

        {loading ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-text-muted">Loading...</p>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="mb-2 text-2xl">🏆</div>
            <p className="text-sm text-text-muted">
              No scores yet. Complete a case to appear on the leaderboard.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card
                key={entry.teamName + entry.rank}
                className={
                  entry.rank <= 3
                    ? "border-gold/30"
                    : "border-border-dark"
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-700 text-xs font-bold text-text-secondary">
                    {entry.rank === 1
                      ? "🥇"
                      : entry.rank === 2
                      ? "🥈"
                      : entry.rank === 3
                      ? "🥉"
                      : `#${entry.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {entry.teamName}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {entry.mysteriesCompleted} case
                      {entry.mysteriesCompleted !== 1 ? "s" : ""} completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gold">
                      {entry.totalScore}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {entry.hintsUsed} hints &middot;{" "}
                      {entry.wrongAttempts} wrong
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {lastUpdated && (
          <p className="mt-4 text-center text-[10px] text-text-muted">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <Button variant="ghost" size="sm" onClick={loadData}>
            Refresh
          </Button>
          <a
            href="/"
            className="text-xs uppercase tracking-wider text-text-muted hover:text-gold transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
