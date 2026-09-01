"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";

export interface CaseFile {
  id: string;
  order: number;
  title: string;
  victim: string;
  suspects: { id: string; name: string; role: string; alibi: string | null }[];
  solution: {
    murderer: string;
    alsoAccepted: string[];
    motive: string;
    motiveMustConvey: string[];
    alsoAcceptedMotives: string[];
    rejectedMotives: string[];
    explanation: string;
    provedBy: string[];
  } | null;
  proof: { required: string[]; alsoAllowed: string[]; maxSelections: number } | null;
  alibiBreaks: {
    suspect: string;
    needs: string[];
    consequence: string;
    reveal: string;
  }[];
  confrontations: {
    suspect: string;
    shown: string;
    posture: string;
    admits: string;
  }[];
  hints: { level: number; points: string[]; says: string }[];
}

/**
 * The answer key, for settling questions mid-event.
 *
 * Kept behind a deliberate reveal so opening the admin on a shared laptop does
 * not spoil the case for whoever is looking over your shoulder.
 */
export function CaseFilesTab({
  cases,
  loading,
}: {
  cases: CaseFile[];
  loading: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (loading && cases.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} lines={2} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card tone="gold">
        <p className="text-sm text-text-secondary">
          Everything below is the solution. Open a case only when you need to
          settle a question, and mind who can see your screen.
        </p>
      </Card>

      {cases.map((file) => {
        const isOpen = open === file.id;
        return (
          <Card key={file.id} title={`Case ${file.order} · ${file.title}`}>
            <p className="text-sm text-text-muted">Victim: {file.victim}</p>

            {!isOpen ? (
              <Button
                variant="gold"
                fullWidth
                className="mt-3"
                onClick={() => setOpen(file.id)}
              >
                Reveal the answers
              </Button>
            ) : (
              <div className="mt-4 space-y-4">
                {file.solution && (
                  <Section title="The answer">
                    <p className="font-display text-lg text-text-primary">
                      {file.solution.murderer}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Also accepted: {file.solution.alsoAccepted.join(", ")}
                    </p>
                    <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                      {file.solution.motive}
                    </p>
                  </Section>
                )}

                {file.proof && (
                  <Section title="What proves it">
                    <div className="flex flex-wrap gap-1.5">
                      {file.proof.required.map((title) => (
                        <Badge key={title} tone="accent">
                          {title}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      All {file.proof.required.length} required, up to{" "}
                      {file.proof.maxSelections} selections, one stray pick
                      forgiven. Also allowed:{" "}
                      {file.proof.alsoAllowed.join(", ") || "nothing else"}.
                    </p>
                  </Section>
                )}

                {file.solution && (
                  <Section title="Motive: what counts">
                    <p className="text-sm text-text-secondary">
                      Must convey: {file.solution.motiveMustConvey.join("; ")}
                    </p>
                    <p className="mt-2 text-sm text-success">
                      Accept: {file.solution.alsoAcceptedMotives.join(" / ")}
                    </p>
                    <p className="mt-2 text-sm text-error">
                      Reject: {file.solution.rejectedMotives.join(" / ")}
                    </p>
                  </Section>
                )}

                {file.alibiBreaks.length > 0 && (
                  <Section title="Alibis that can be broken">
                    <ul className="space-y-2">
                      {file.alibiBreaks.map((entry) => (
                        <li
                          key={entry.suspect}
                          className="rounded bg-ink-900 p-2.5"
                        >
                          <p className="text-sm text-text-primary">
                            {entry.suspect}{" "}
                            <Badge
                              tone={
                                entry.consequence === "places-at-scene"
                                  ? "error"
                                  : "gold"
                              }
                            >
                              {entry.consequence === "places-at-scene"
                                ? "puts them at the scene"
                                : "only weakens it"}
                            </Badge>
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            Needs: {entry.needs.join(" + ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                <Section title="Hints, in order">
                  <ol className="space-y-1.5">
                    {file.hints.map((hint) => (
                      <li key={hint.level} className="text-sm text-text-secondary">
                        <span className="font-mono text-xs text-gold">
                          {hint.level}.
                        </span>{" "}
                        {hint.says}
                      </li>
                    ))}
                  </ol>
                </Section>

                {file.solution && (
                  <Section title="Full explanation">
                    <p className="text-[15px] leading-relaxed text-text-secondary">
                      {file.solution.explanation}
                    </p>
                  </Section>
                )}

                <Button variant="ghost" fullWidth onClick={() => setOpen(null)}>
                  Hide again
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border-dark pt-3">
      <p className="mb-2 font-display text-[11px] uppercase tracking-[0.15em] text-gold">
        {title}
      </p>
      {children}
    </div>
  );
}
