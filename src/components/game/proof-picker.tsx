"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { Mystery } from "@/types";

/**
 * "Name the clues that prove it."
 *
 * Seeded from the evidence the team starred while investigating, so the star
 * toggle finally earns its keep as the shortlist that feeds the accusation.
 * The cap is enforced here as well as on the server, and shown as a running
 * count so nobody discovers it by being rejected.
 */
export function ProofPicker({
  mystery,
  stage,
  selected,
  onChange,
  maxSelections,
  disabled,
}: {
  mystery: Mystery;
  /** Only evidence the team has actually uncovered. */
  stage?: number;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelections: number;
  disabled?: boolean;
}) {
  const atCap = selected.length >= maxSelections;

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((e) => e !== id));
    } else if (!atCap) {
      onChange([...selected, id]);
    }
  }

  // Reading order, same as the evidence tab.
  const items = [...mystery.evidence]
    .filter((item) => (item.unlockStage ?? 1) <= (stage ?? 4))
    .sort((a, b) => (a.unlockStage ?? 0) - (b.unlockStage ?? 0));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="font-display text-xs uppercase tracking-[0.15em] text-text-secondary">
          What proves it?
        </label>
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            atCap ? "text-gold" : "text-text-muted",
          )}
          role="status"
        >
          {selected.length} of {maxSelections}
        </span>
      </div>

      <ul className="space-y-1.5">
        {items.map((item) => {
          const isChosen = selected.includes(item.id);
          const isBlocked = !isChosen && atCap;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                disabled={disabled || isBlocked}
                aria-pressed={isChosen}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors",
                  isChosen
                    ? "border-accent bg-accent/10"
                    : "border-border-dark hover:border-border-mid",
                  isBlocked && "opacity-40",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[11px]",
                    isChosen
                      ? "border-accent bg-accent text-white"
                      : "border-border-mid text-transparent",
                  )}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">
                    {item.title}
                  </span>
                </span>
                <Badge className="shrink-0">{item.category}</Badge>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-xs text-text-muted">
        Pick only what actually proves your case. Extra guesses weaken it.
      </p>
    </div>
  );
}
