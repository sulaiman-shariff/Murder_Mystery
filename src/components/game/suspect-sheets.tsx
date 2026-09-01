"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stamp } from "@/components/ui/stamp";
import { getTeam } from "@/lib/storage/local";
import { cn } from "@/lib/cn";
import type { Mystery, Suspect } from "@/types";

function EvidenceChecklist({
  mystery,
  selected,
  onChange,
  single = false,
  disabled,
}: {
  mystery: Mystery;
  selected: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
  disabled?: boolean;
}) {
  const items = [...mystery.evidence].sort(
    (a, b) => (a.unlockStage ?? 0) - (b.unlockStage ?? 0)
  );

  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const isChosen = selected.includes(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(
                  single
                    ? [item.id]
                    : isChosen
                      ? selected.filter((e) => e !== item.id)
                      : [...selected, item.id]
                )
              }
              aria-pressed={isChosen}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors",
                isChosen
                  ? "border-accent bg-accent/10"
                  : "border-border-dark hover:border-border-mid",
                disabled && "cursor-not-allowed opacity-50"
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
  );
}

/**
 * Challenge an alibi. A failed challenge costs no attempt but burns one of
 * two tries — cheap to test a hunch, impossible to enumerate.
 */
export function AlibiSheet({
  mystery,
  suspect,
  onClose,
  onBroken,
}: {
  mystery: Mystery;
  suspect: Suspect;
  onClose: () => void;
  onBroken: (suspectId: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    broken: boolean;
    text: string;
    consequence?: string;
  } | null>(null);

  const placeName =
    mystery.places?.find((p) => p.id === suspect.alibi?.placeId)?.name ?? "";

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/alibi/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: getTeam()?.id,
          mysteryId: mystery.id,
          suspectId: suspect.id,
          evidenceIds: selected,
        }),
      });
      const data = await res.json();

      if (data.broken) {
        setResult({ broken: true, text: data.reveal, consequence: data.consequence });
        onBroken(suspect.id);
      } else {
        setResult({ broken: false, text: data.message ?? "That does not contradict what they told you." });
      }
    } catch {
      setResult({ broken: false, text: "That could not be checked just now." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={`${suspect.name}'s alibi`}
      tone="gold"
      onClose={onClose}
      footer={
        result?.broken ? (
          <Button fullWidth size="lg" variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            variant="gold"
            loading={busy}
            disabled={selected.length === 0}
            onClick={submit}
          >
            Put it to them
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <Card tone="gold">
          <p className="text-[15px] italic leading-relaxed text-text-secondary">
            &ldquo;{suspect.alibi?.claim}&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {placeName && <Badge>{placeName}</Badge>}
            <Badge tone={suspect.alibi?.corroboratedBy.length ? "default" : "error"}>
              {suspect.alibi?.corroboratedBy.length
                ? "Corroborated"
                : "Nobody can vouch"}
            </Badge>
          </div>
        </Card>

        {result ? (
          <Card
            tone={result.broken ? "accent" : "default"}
            className="animate-rise text-center"
          >
            {result.broken && (
              <Stamp tone="accent" className="mb-4 text-xs">
                {result.consequence === "places-at-scene"
                  ? "Alibi broken"
                  : "Story doesn't hold"}
              </Stamp>
            )}
            <p className="text-[15px] leading-relaxed text-text-secondary">
              {result.text}
            </p>
          </Card>
        ) : (
          <div>
            <p className="mb-2 font-display text-xs uppercase tracking-[0.15em] text-text-secondary">
              What contradicts it?
            </p>
            <EvidenceChecklist
              mystery={mystery}
              selected={selected}
              onChange={setSelected}
              disabled={busy}
            />
            <p className="mt-2 text-xs text-text-muted">
              Breaking an alibi proves they lied. It does not, on its own, prove
              they did it.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Confront a suspect with one piece of evidence and hear what they say. */
export function InterrogateSheet({
  mystery,
  suspect,
  onClose,
}: {
  mystery: Mystery;
  suspect: Suspect;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState<{ title: string; reply: string }[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function confront() {
    const evidenceId = selected[0];
    if (!evidenceId) return;
    const title =
      mystery.evidence.find((e) => e.id === evidenceId)?.title ?? "that";

    setBusy(true);
    try {
      const res = await fetch("/api/ai/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: getTeam()?.id,
          mysteryId: mystery.id,
          suspectId: suspect.id,
          evidenceId,
        }),
      });
      const data = await res.json();
      setReplies((prev) => [...prev, { title, reply: data.reply }]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setSelected([]);
    } catch {
      setReplies((prev) => [
        ...prev,
        { title, reply: "They say nothing you can use." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={`Confront ${suspect.name}`}
      meta={remaining === null ? undefined : `${remaining} left`}
      onClose={onClose}
      footer={
        <Button
          fullWidth
          size="lg"
          loading={busy}
          disabled={selected.length === 0 || remaining === 0}
          onClick={confront}
        >
          {remaining === 0 ? "They have stopped talking" : "Show them"}
        </Button>
      }
    >
      <div className="space-y-4">
        {replies.map((entry, index) => (
          <Card key={index} title={entry.title} className="animate-rise">
            <p className="text-[15px] italic leading-relaxed text-text-secondary">
              &ldquo;{entry.reply}&rdquo;
            </p>
          </Card>
        ))}

        <div>
          <p className="mb-2 font-display text-xs uppercase tracking-[0.15em] text-text-secondary">
            Show them one thing
          </p>
          <EvidenceChecklist
            mystery={mystery}
            selected={selected}
            onChange={setSelected}
            single
            disabled={busy || remaining === 0}
          />
          <p className="mt-2 text-xs text-text-muted">
            You only get a handful of these across the whole case. Choose what
            you actually want an answer about.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
