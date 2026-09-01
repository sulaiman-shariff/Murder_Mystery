"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { BoardPin, Mystery } from "@/types";

/**
 * The team's working theory.
 *
 * A link is fully described by (evidenceId, suspectId) — no coordinates are
 * stored. Node positions are computed, which is what makes "list on a phone,
 * corkboard on a laptop" the same data rather than two features.
 *
 * The board never says whether a link is right. It is graded once, silently,
 * at accusation time; a live correct/incorrect signal would be an oracle to
 * toggle against.
 */
export function BoardPanel({
  mystery,
  pins,
  onChange,
  alibisBroken,
}: {
  mystery: Mystery;
  pins: BoardPin[];
  onChange: (next: BoardPin[]) => void;
  alibisBroken: string[];
}) {
  const [pinningFor, setPinningFor] = useState<string | null>(null);

  const pinsFor = (suspectId: string) =>
    pins.filter((p) => p.suspectId === suspectId);

  function togglePin(suspectId: string, evidenceId: string) {
    const exists = pins.some(
      (p) => p.suspectId === suspectId && p.evidenceId === evidenceId
    );
    onChange(
      exists
        ? pins.filter(
            (p) => !(p.suspectId === suspectId && p.evidenceId === evidenceId)
          )
        : [...pins, { suspectId, evidenceId, at: Date.now() }]
    );
  }

  const activeSuspect = mystery.suspects.find((s) => s.id === pinningFor);

  return (
    <>
      <p className="mb-3 text-sm text-text-secondary">
        Pin the clues you think belong to each suspect. Nothing here is checked
        until you accuse — it is your theory, not the answer.
      </p>

      {/* Phone: one drawer per suspect. */}
      <div className="space-y-3 lg:hidden">
        {mystery.suspects.map((suspect) => (
          <SuspectDrawer
            key={suspect.id}
            mystery={mystery}
            suspectId={suspect.id}
            name={suspect.name}
            role={suspect.role}
            pins={pinsFor(suspect.id)}
            broken={alibisBroken.includes(suspect.id)}
            onAdd={() => setPinningFor(suspect.id)}
            onRemove={(evidenceId) => togglePin(suspect.id, evidenceId)}
          />
        ))}
      </div>

      {/* Desktop: the same links, drawn. */}
      <div className="hidden lg:block">
        <CorkBoard
          mystery={mystery}
          pins={pins}
          alibisBroken={alibisBroken}
          onPickFor={setPinningFor}
          onRemove={togglePin}
        />
      </div>

      {activeSuspect && (
        <Sheet
          title={`Pin to ${activeSuspect.name}`}
          onClose={() => setPinningFor(null)}
          footer={
            <Button fullWidth size="lg" variant="secondary" onClick={() => setPinningFor(null)}>
              Done
            </Button>
          }
        >
          <ul className="space-y-1.5">
            {[...mystery.evidence]
              .sort((a, b) => (a.unlockStage ?? 0) - (b.unlockStage ?? 0))
              .map((item) => {
                const isPinned = pins.some(
                  (p) =>
                    p.suspectId === activeSuspect.id && p.evidenceId === item.id
                );
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => togglePin(activeSuspect.id, item.id)}
                      aria-pressed={isPinned}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors",
                        isPinned
                          ? "border-accent bg-accent/10"
                          : "border-border-dark hover:border-border-mid"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {item.title}
                      </span>
                      <Badge className="shrink-0">{item.category}</Badge>
                    </button>
                  </li>
                );
              })}
          </ul>
        </Sheet>
      )}
    </>
  );
}

function SuspectDrawer({
  mystery,
  name,
  role,
  pins,
  broken,
  onAdd,
  onRemove,
}: {
  mystery: Mystery;
  suspectId: string;
  name: string;
  role: string;
  pins: BoardPin[];
  broken: boolean;
  onAdd: () => void;
  onRemove: (evidenceId: string) => void;
}) {
  return (
    <Card tone={pins.length ? "accent" : "default"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base text-text-primary">
            {name}
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {role}
          </p>
        </div>
        {broken && <Badge tone="error">Alibi broken</Badge>}
      </div>

      {pins.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border-dark pt-3">
          {pins.map((pin) => {
            const item = mystery.evidence.find((e) => e.id === pin.evidenceId);
            return (
              <li
                key={pin.evidenceId}
                className="flex items-center gap-2 rounded bg-ink-900 px-2.5 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                  {item?.title ?? pin.evidenceId}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(pin.evidenceId)}
                  aria-label={`Unpin ${item?.title ?? "clue"}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-text-muted hover:text-error"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="ghost" fullWidth className="mt-3" onClick={onAdd}>
        {pins.length ? "Pin more evidence" : "Pin evidence"}
      </Button>
    </Card>
  );
}

/** Suspects in a column, clues in a column, links drawn between them. */
function CorkBoard({
  mystery,
  pins,
  alibisBroken,
  onPickFor,
  onRemove,
}: {
  mystery: Mystery;
  pins: BoardPin[];
  alibisBroken: string[];
  onPickFor: (suspectId: string) => void;
  onRemove: (suspectId: string, evidenceId: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const evidence = [...mystery.evidence].sort(
    (a, b) => (a.unlockStage ?? 0) - (b.unlockStage ?? 0)
  );

  const ROW = 64;
  const PAD = 16;
  const height = Math.max(evidence.length, mystery.suspects.length) * ROW + PAD * 2;

  const suspectY = (i: number) =>
    PAD + ((i + 0.5) * (height - PAD * 2)) / mystery.suspects.length;
  const evidenceY = (i: number) =>
    PAD + ((i + 0.5) * (height - PAD * 2)) / evidence.length;

  return (
    <div
      className="relative overflow-hidden rounded-card border border-border-dark bg-ink-800"
      style={{ height }}
    >
      {/* Links sit behind the cards. */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      >
        {pins.map((pin) => {
          const si = mystery.suspects.findIndex((s) => s.id === pin.suspectId);
          const ei = evidence.findIndex((e) => e.id === pin.evidenceId);
          if (si < 0 || ei < 0) return null;
          const dim = hovered && hovered !== pin.suspectId;
          return (
            <path
              key={`${pin.suspectId}|${pin.evidenceId}`}
              d={`M 30% ${suspectY(si)} C 45% ${suspectY(si)}, 55% ${evidenceY(ei)}, 70% ${evidenceY(ei)}`}
              className={cn(
                "transition-opacity",
                dim ? "opacity-15" : "opacity-70"
              )}
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              fill="none"
            />
          );
        })}
      </svg>

      <div className="relative grid h-full grid-cols-[30%_1fr_30%]">
        <div className="flex flex-col justify-around py-4 pl-4">
          {mystery.suspects.map((suspect) => (
            <button
              key={suspect.id}
              type="button"
              onMouseEnter={() => setHovered(suspect.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onPickFor(suspect.id)}
              className={cn(
                "min-h-11 rounded border bg-ink-700 px-3 py-2 text-left transition-colors",
                alibisBroken.includes(suspect.id)
                  ? "border-error/50"
                  : "border-border-mid hover:border-accent"
              )}
            >
              <span className="block truncate font-display text-sm text-text-primary">
                {suspect.name}
              </span>
              <span className="block truncate font-mono text-[11px] uppercase text-text-muted">
                {alibisBroken.includes(suspect.id) ? "Alibi broken" : suspect.role}
              </span>
            </button>
          ))}
        </div>

        <div aria-hidden="true" />

        <div className="flex flex-col justify-around py-4 pr-4">
          {evidence.map((item) => {
            const linked = pins.filter((p) => p.evidenceId === item.id);
            const dim =
              hovered && !linked.some((p) => p.suspectId === hovered);
            return (
              <div
                key={item.id}
                className={cn(
                  "min-h-11 rounded border border-border-mid bg-ink-700 px-3 py-2 transition-opacity",
                  dim && "opacity-40"
                )}
              >
                <span className="block truncate text-sm text-text-secondary">
                  {item.title}
                </span>
                {linked.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {linked.map((pin) => {
                      const suspect = mystery.suspects.find(
                        (s) => s.id === pin.suspectId
                      );
                      return (
                        <button
                          key={pin.suspectId}
                          type="button"
                          onClick={() => onRemove(pin.suspectId, item.id)}
                          className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] text-accent-light hover:bg-error/25 hover:text-error"
                          aria-label={`Unpin from ${suspect?.name}`}
                        >
                          {suspect?.name.split(" ")[0]} ×
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
