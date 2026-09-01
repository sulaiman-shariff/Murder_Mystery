"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { FLAG_LABELS, type TeamFlag } from "@/lib/admin/monitor";
import { MYSTERY_NAMES, formatTime } from "../lib";
import { cn } from "@/lib/cn";

export interface MonitorTeam {
  teamId: string;
  teamName: string;
  current: {
    mysteryId: string;
    status: string;
    secondsOnCase: number;
    secondsSinceActivity: number;
    wrongAttempts: number;
    hintsUsed: number;
    attemptsRemaining: number;
  } | null;
  solved: number;
  totalScore: number;
  flags: TeamFlag[];
}

const FLAG_TONE: Record<TeamFlag, "error" | "gold" | "default"> = {
  "locked-out": "error",
  "burning-attempts": "error",
  quiet: "gold",
  stalled: "gold",
  "not-started": "default",
};

function ago(seconds: number): string {
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

/**
 * Who is playing what, and who needs help.
 *
 * Sorted so the teams that need attention float to the top — during an event
 * this is the screen you leave open, and scanning it should not be work.
 */
export function LiveMonitor({
  teams,
  loading,
  counts,
  onRescue,
}: {
  teams: MonitorTeam[];
  loading: boolean;
  counts: { teams: number; playing: number; solved: number; needHelp: number };
  onRescue: (team: MonitorTeam) => void;
}) {
  const ordered = [...teams].sort((a, b) => {
    if (a.flags.length !== b.flags.length) return b.flags.length - a.flags.length;
    return a.teamName.localeCompare(b.teamName);
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Teams" value={counts.teams} />
        <Stat label="Playing" value={counts.playing} tone="text-gold" />
        <Stat label="Cases solved" value={counts.solved} tone="text-success" />
        <Stat
          label="Need help"
          value={counts.needHelp}
          tone={counts.needHelp > 0 ? "text-error" : "text-text-primary"}
        />
      </div>

      {loading && teams.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-sm text-text-muted">
            No teams have joined this event yet.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {ordered.map((team) => (
            <li key={team.teamId}>
              <Card tone={team.flags.length ? "error" : "default"}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="truncate font-display text-base text-text-primary">
                        {team.teamName}
                      </p>
                      {team.flags.map((flag) => (
                        <Badge key={flag} tone={FLAG_TONE[flag]}>
                          {FLAG_LABELS[flag]}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-text-muted">
                      {team.current ? (
                        <>
                          {MYSTERY_NAMES[team.current.mysteryId] ??
                            team.current.mysteryId}
                          {" · "}
                          {formatTime(team.current.secondsOnCase)} on it
                          {" · "}
                          active {ago(team.current.secondsSinceActivity)}
                        </>
                      ) : (
                        "Registered, not started"
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {team.current && (
                      <>
                        <Badge
                          tone={
                            team.current.attemptsRemaining <= 2 ? "error" : "default"
                          }
                        >
                          {team.current.attemptsRemaining} left
                        </Badge>
                        <Badge>{team.current.hintsUsed}H</Badge>
                      </>
                    )}
                    <Badge tone="gold">{team.solved} solved</Badge>
                    <span
                      className={cn(
                        "w-14 text-right font-mono text-base font-semibold tabular-nums text-gold"
                      )}
                    >
                      {team.totalScore}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => onRescue(team)}>
                      Help
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-text-primary",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card className="text-center">
      <p className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </p>
    </Card>
  );
}
