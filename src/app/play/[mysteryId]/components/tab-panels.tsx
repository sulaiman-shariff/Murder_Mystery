"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { StarIcon } from "@/components/ui/icons";
import { Disclosure } from "./disclosure";
import { cn } from "@/lib/cn";
import type { Mystery } from "@/types";

const EVIDENCE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "physical", label: "Physical" },
  { value: "statement", label: "Statements" },
  { value: "document", label: "Documents" },
  { value: "timeline", label: "Timeline" },
  { value: "digital", label: "Digital" },
] as const;

/** Long-form reading gets a comfortable measure instead of stretching wide. */
const PROSE = "max-w-prose text-[15px] leading-relaxed text-text-secondary";

export function IntroPanel({
  mystery,
  onGoToStory,
  onGoToSuspects,
}: {
  mystery: Mystery;
  onGoToStory: () => void;
  onGoToSuspects: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      <Card title="The Brief">
        <p className={PROSE}>{mystery.introduction}</p>
      </Card>

      <Card title="The Victim">
        <p className="font-display text-base text-text-primary">
          {mystery.victim.name}
        </p>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {mystery.victim.role}
          {mystery.victim.age ? ` · ${mystery.victim.age}` : ""}
        </p>
        <p className={cn(PROSE, "mt-3")}>{mystery.victim.description}</p>
      </Card>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 sm:flex-row">
        <Button fullWidth onClick={onGoToStory}>
          Read the story
        </Button>
        <Button variant="secondary" fullWidth onClick={onGoToSuspects}>
          Meet the suspects
        </Button>
      </div>
    </div>
  );
}

export function StoryPanel({ mystery }: { mystery: Mystery }) {
  // Prose stays in one centred column; two columns of story would be a
  // worse read than a slightly narrower one.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    // Open the first section so the tab is never a wall of closed headings.
    mystery.storySections.length
      ? { [mystery.storySections[0].id]: true }
      : {}
  );

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {mystery.storySections.map((section) => (
        <Card key={section.id}>
          <Disclosure
            open={!!expanded[section.id]}
            onToggle={() =>
              setExpanded((prev) => ({
                ...prev,
                [section.id]: !prev[section.id],
              }))
            }
            summary={
              <h3 className="font-display text-xs uppercase tracking-[0.15em] text-gold">
                {section.title}
              </h3>
            }
          >
            <p className={PROSE}>{section.content}</p>
          </Disclosure>
        </Card>
      ))}
    </div>
  );
}

export function SuspectsPanel({
  mystery,
  notes,
  onNoteChange,
}: {
  mystery: Mystery;
  notes: Record<string, string>;
  onNoteChange: (suspectId: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {mystery.suspects.map((suspect) => (
        <Card key={suspect.id}>
          <Disclosure
            open={expanded === suspect.id}
            onToggle={() =>
              setExpanded((prev) => (prev === suspect.id ? null : suspect.id))
            }
            summary={
              <div className="min-w-0">
                <h3 className="truncate font-display text-base text-text-primary">
                  {suspect.name}
                </h3>
                <p className="truncate font-mono text-xs uppercase tracking-wider text-text-muted">
                  {suspect.role} · {suspect.relationshipToVictim}
                </p>
              </div>
            }
          >
            <div className="space-y-4">
              <Field label="Statement">
                <p
                  className={cn(
                    PROSE,
                    "border-l-2 border-accent/40 pl-3 italic"
                  )}
                >
                  &ldquo;{suspect.statement}&rdquo;
                </p>
              </Field>

              {suspect.alibi && (
                <Field label="Alibi">
                  <p className={cn(PROSE, "border-l-2 border-gold/40 pl-3")}>
                    &ldquo;{suspect.alibi.claim}&rdquo;
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-3">
                    <Badge>
                      {placeName(mystery, suspect.alibi.placeId)}
                    </Badge>
                    <Badge>
                      {windowLabel(mystery, suspect.alibi.from, suspect.alibi.to)}
                    </Badge>
                    {/* Whether anyone can vouch is information the player is
                        entitled to — it is what makes an alibi checkable. */}
                    <Badge
                      tone={
                        suspect.alibi.corroboratedBy.length ? "default" : "error"
                      }
                    >
                      {suspect.alibi.corroboratedBy.length
                        ? "Corroborated"
                        : "Uncorroborated"}
                    </Badge>
                  </div>
                </Field>
              )}

              <Field label="Points of interest">
                <ul className="space-y-1.5">
                  {suspect.suspiciousDetails.map((detail, index) => (
                    <li
                      key={`${suspect.id}-detail-${index}`}
                      className="flex gap-2 text-sm leading-relaxed text-text-secondary"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </Field>

              <Field label="Your notes">
                <Textarea
                  value={notes[suspect.id] || ""}
                  onChange={(e) => onNoteChange(suspect.id, e.target.value)}
                  placeholder="What stands out about them?"
                  rows={3}
                  className="bg-ink-700"
                />
              </Field>
            </div>
          </Disclosure>
        </Card>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}

export function EvidencePanel({
  mystery,
  importantEvidence,
  onToggleEvidence,
}: {
  mystery: Mystery;
  importantEvidence: string[];
  onToggleEvidence: (evidenceId: string) => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const visible = mystery.evidence.filter(
    (item) => filter === "all" || item.category === filter
  );

  return (
    <div className="space-y-3">
      <div className="scroll-region -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EVIDENCE_CATEGORIES.map((category) => (
          <button
            key={category.value}
            type="button"
            onClick={() => setFilter(category.value)}
            aria-pressed={filter === category.value}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 py-2",
              "font-mono text-xs uppercase tracking-wider transition-colors",
              filter === category.value
                ? "border-accent bg-accent/15 text-accent-light"
                : "border-border-mid text-text-muted hover:text-text-primary"
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-text-muted">
            No evidence of this kind in the file.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {visible.map((item) => {
          const isMarked = importantEvidence.includes(item.id);

          return (
            <Card key={item.id} tone={isMarked ? "accent" : "default"}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base text-text-primary">
                    {item.title}
                  </h3>
                  <Badge className="mt-1">{item.category}</Badge>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleEvidence(item.id)}
                  aria-pressed={isMarked}
                  aria-label={
                    isMarked
                      ? `Unmark ${item.title} as important`
                      : `Mark ${item.title} as important`
                  }
                  className={cn(
                    "-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded transition-colors",
                    isMarked
                      ? "text-gold"
                      : "text-text-muted hover:text-text-primary active:bg-ink-700"
                  )}
                >
                  <StarIcon className="h-5 w-5" filled={isMarked} />
                </button>
              </div>

              <p className={cn(PROSE, "mt-2")}>{item.description}</p>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}

function placeName(mystery: Mystery, placeId: string): string {
  return mystery.places?.find((p) => p.id === placeId)?.name ?? "Unknown";
}

/** Renders a case-clock window using the timeline's own display strings. */
function windowLabel(mystery: Mystery, from: number, to: number): string {
  const label = (t: number) => {
    const events = mystery.timeline ?? [];
    const exact = events.find((e) => e.t === t);
    if (exact) return exact.time;
    // Fall back to the nearest earlier marker so the window still reads.
    const earlier = [...events].filter((e) => e.t <= t).sort((a, b) => b.t - a.t)[0];
    return earlier ? earlier.time : `+${t}m`;
  };
  return `${label(from)} – ${label(to)}`;
}

export function TimelinePanel({ mystery }: { mystery: Mystery }) {
  // Sort by the case clock, never by array order — the display `time` strings
  // are free-form and unsortable by design.
  const timeline = [...(mystery.timeline ?? [])].sort((a, b) => a.t - b.t);

  if (timeline.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-text-muted">
          No timeline was reconstructed for this case.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
    <Card title="Timeline of events">
      <ol className="space-y-0">
        {timeline.map((event, index) => {
          const suspect = event.relatedSuspectId
            ? mystery.suspects.find((s) => s.id === event.relatedSuspectId)
            : undefined;
          const isLast = index === timeline.length - 1;

          return (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    suspect ? "bg-accent" : "bg-ink-400"
                  )}
                />
                {!isLast && <span className="w-px flex-1 bg-border-mid" />}
              </div>

              <div className={cn("min-w-0", isLast ? "pb-0" : "pb-5")}>
                <p className="font-mono text-xs uppercase tracking-wider text-gold">
                  {event.time}
                </p>
                <p className="mt-0.5 text-[15px] leading-relaxed text-text-secondary">
                  {event.event}
                </p>
                {suspect && (
                  <Badge tone="accent" className="mt-1.5">
                    {suspect.name}
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
    </div>
  );
}
