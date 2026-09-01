"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { LeaderboardEntry } from "@/types";

const REFRESH_MS = 15_000;

/**
 * The big-screen standings.
 *
 * Public and unauthenticated on purpose: the data is already public through
 * /api/leaderboard and /leaderboard, and putting an admin cookie on a machine
 * driving a projector in a room full of players would hand the dashboard to
 * anyone who walks up to it. Consequently this page must render nothing the
 * public leaderboard does not already expose — no PINs, no ids.
 */
function Screen() {
  const params = useSearchParams();
  const eventCode = params.get("eventCode") || process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "";
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(
          `/api/leaderboard?eventCode=${encodeURIComponent(eventCode)}`
        );
        const data = await res.json();
        if (!alive) return;
        setEntries(data.leaderboard || []);
        setUpdated(new Date().toLocaleTimeString());
      } catch {
        // A dropped refresh just shows the previous standings.
      }
    }
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventCode]);

  const top = entries.slice(0, 10);

  return (
    <div className="flex min-h-dvh flex-col bg-ink-900 px-[3vw] py-[3vh]">
      <header className="mb-[3vh] flex items-baseline justify-between">
        <h1 className="font-display uppercase tracking-[0.15em] text-accent [font-size:clamp(2rem,5vw,5rem)]">
          Standings
        </h1>
        <span className="font-mono uppercase tracking-[0.2em] text-text-muted [font-size:clamp(0.75rem,1.4vw,1.5rem)]">
          {eventCode}
        </span>
      </header>

      {top.length === 0 ? (
        <p className="m-auto font-display text-text-muted [font-size:clamp(1.25rem,3vw,3rem)]">
          No cases closed yet.
        </p>
      ) : (
        <ol className="flex flex-1 flex-col justify-around">
          {top.map((entry) => (
            <li
              key={`${entry.teamName}-${entry.rank}`}
              className="flex items-center gap-[2vw] border-b border-border-dark py-[1vh] last:border-0"
            >
              <span
                className={`w-[6vw] shrink-0 text-right font-mono tabular-nums [font-size:clamp(1.5rem,3.5vw,3.5rem)] ${
                  entry.rank <= 3 ? "text-gold" : "text-text-muted"
                }`}
              >
                {entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-text-primary [font-size:clamp(1.5rem,3.5vw,3.5rem)]">
                {entry.teamName}
              </span>
              <span className="shrink-0 font-mono uppercase tracking-wider text-text-muted [font-size:clamp(0.7rem,1.3vw,1.4rem)]">
                {entry.mysteriesCompleted} solved
              </span>
              <span className="w-[10vw] shrink-0 text-right font-mono font-semibold tabular-nums text-gold [font-size:clamp(1.5rem,3.5vw,3.5rem)]">
                {entry.totalScore}
              </span>
            </li>
          ))}
        </ol>
      )}

      <footer className="mt-[2vh] text-center font-mono text-text-muted [font-size:clamp(0.65rem,1vw,1rem)]">
        Updated {updated}
      </footer>
    </div>
  );
}

export default function ProjectorPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ink-900" />}>
      <Screen />
    </Suspense>
  );
}
