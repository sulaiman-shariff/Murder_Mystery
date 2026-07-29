"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const [error, setError] = useState("");
  const [eventCode, setEventCode] = useState(typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "") : "");
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/leaderboard?eventId=${encodeURIComponent(eventCode)}`);
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const data = await res.json();
      setEntries(data.leaderboard || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard data");
    } finally {
      setLoading(false);
    }
  }, [eventCode]);

  useEffect(() => {
    loadData();
    autoRefreshRef.current = setInterval(loadData, 60000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [loadData]);

  function exportCSV() {
    const header = "Rank,Team,Score,Mysteries Completed,Total Time (s),Hints Used,Wrong Attempts";
    const rows = entries.map(
      (e) => `${e.rank},"${e.teamName}",${e.totalScore},${e.mysteriesCompleted},${e.totalTime},${e.hintsUsed},${e.wrongAttempts}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

        {error && (
          <Card className="mb-4 border-error/30 bg-error/5 p-3 text-center">
            <p className="text-xs text-error">{error}</p>
          </Card>
        )}

        {loading && entries.length === 0 ? (
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
                      {" · "}
                      {formatTime(entry.totalTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gold">
                      {entry.totalScore}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {entry.hintsUsed} hints ·{" "}
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

        <div className="mt-6 flex justify-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={loadData}>
            Refresh
          </Button>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
          )}
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
