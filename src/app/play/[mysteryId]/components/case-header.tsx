"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MagnifierIcon } from "@/components/ui/icons";

export function CaseHeader({
  order,
  title,
  elapsedSeconds,
  wrongAttempts,
  maxAttempts,
  completed,
}: {
  order: number;
  title: string;
  elapsedSeconds: number;
  wrongAttempts: number;
  maxAttempts: number;
  completed: boolean;
}) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timer = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  const attemptsLeft = Math.max(0, maxAttempts - wrongAttempts);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Link
        href="/"
        aria-label="Back to home"
        className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded text-accent transition-colors hover:bg-ink-800"
      >
        <MagnifierIcon className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Case {String(order).padStart(2, "0")}
        </p>
        <h1 className="truncate font-display text-sm text-text-primary">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="font-mono text-sm tabular-nums text-text-primary"
          aria-label="Elapsed time"
        >
          {timer}
        </span>
        {completed ? (
          <Badge tone="gold">Closed</Badge>
        ) : (
          <Badge tone={attemptsLeft <= 2 ? "error" : "default"}>
            {attemptsLeft} left
          </Badge>
        )}
      </div>
    </div>
  );
}
