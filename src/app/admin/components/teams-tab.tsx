"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ChevronIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { MYSTERY_NAMES, formatTime } from "../lib";
import type { AdminTeam, SessionStatus } from "@/types";

const statusTone: Record<SessionStatus, string> = {
  completed: "text-success",
  failed: "text-error",
  in_progress: "text-gold",
  not_started: "text-text-muted",
};

const statusLabel: Record<SessionStatus, string> = {
  completed: "Solved",
  failed: "Failed",
  in_progress: "Playing",
  not_started: "Not started",
};

export function TeamsTab({
  teams,
  loading,
  onRefresh,
  onResetMystery,
  onResetAll,
  onResetPin,
  onDeleteTeam,
}: {
  teams: AdminTeam[];
  loading: boolean;
  onRefresh: () => void;
  onResetMystery: (teamId: string, mysteryId: string) => void;
  onResetAll: (teamId: string) => void;
  onResetPin: (teamId: string, newPin: string) => void;
  onDeleteTeam: (teamId: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-display text-xs uppercase tracking-[0.15em] text-text-secondary">
          {teams.length} team{teams.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" variant="ghost" onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </div>

      {loading && teams.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-sm text-text-muted">
            No teams have registered yet.
          </p>
        </Card>
      ) : (
        teams.map((team) => {
          const isOpen = expanded === team.id;
          const current =
            team.sessions.find((s) => s.status === "in_progress") ??
            team.sessions.find((s) => s.status === "completed") ??
            team.sessions[0];

          return (
            <Card key={team.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : team.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base text-text-primary">
                    {team.name}
                  </p>
                  <p className="truncate font-mono text-xs text-text-muted">
                    {current ? (
                      <>
                        {MYSTERY_NAMES[current.mysteryId] || current.mysteryId} ·{" "}
                        <span className={statusTone[current.status]}>
                          {statusLabel[current.status]}
                        </span>
                        {current.score > 0 && ` · ${current.score} pts`}
                      </>
                    ) : (
                      "No sessions yet"
                    )}
                  </p>
                </div>
                <ChevronIcon
                  className={cn(
                    "h-4 w-4 shrink-0 text-text-muted transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {isOpen && (
                <div className="animate-rise mt-3 space-y-3 border-t border-border-dark pt-3">
                  <div className="space-y-1.5">
                    {team.sessions.length === 0 && (
                      <p className="text-sm text-text-muted">
                        This team has not started a case.
                      </p>
                    )}
                    {team.sessions.map((session) => (
                      <div
                        key={session.mysteryId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded bg-ink-900 p-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-text-primary">
                            {MYSTERY_NAMES[session.mysteryId] ||
                              session.mysteryId}
                          </p>
                          <p className="font-mono text-xs text-text-muted">
                            <span className={statusTone[session.status]}>
                              {statusLabel[session.status]}
                            </span>
                            {session.score > 0 && ` · ${session.score} pts`}
                            {session.elapsedSeconds > 0 &&
                              ` · ${formatTime(session.elapsedSeconds)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge>
                            {session.hintsUsed}H {session.wrongAttempts}W
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              onResetMystery(team.id, session.mysteryId)
                            }
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <PinReset
                    currentPin={team.pin}
                    onSubmit={(pin) => onResetPin(team.id, pin)}
                  />

                  <div className="flex flex-wrap gap-2 border-t border-border-dark pt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onResetAll(team.id)}
                    >
                      Reset all cases
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDeleteTeam(team.id, team.name)}
                    >
                      Delete team
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function PinReset({
  currentPin,
  onSubmit,
}: {
  currentPin: string;
  onSubmit: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (pin.trim()) {
          onSubmit(pin.trim());
          setPin("");
        }
      }}
      className="flex items-end gap-2"
    >
      <div className="flex-1">
        <label
          htmlFor={`pin-${currentPin}`}
          className="mb-1 block font-display text-[11px] uppercase tracking-[0.15em] text-text-muted"
        >
          New PIN (current: {currentPin})
        </label>
        <input
          id={`pin-${currentPin}`}
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Set a new PIN"
          maxLength={20}
          className="min-h-11 w-full rounded border border-border-dark bg-ink-900 px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={!pin.trim()}>
        Set
      </Button>
    </form>
  );
}
