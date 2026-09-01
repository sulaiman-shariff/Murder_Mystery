"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MYSTERY_IDS, MYSTERY_NAMES } from "../lib";
import type { AdminEvent, AdminTeam } from "@/types";

export function DashboardTab({
  event,
  teams,
  onEventStatusChange,
}: {
  event: AdminEvent;
  teams: AdminTeam[];
  onEventStatusChange: (status: string) => void;
}) {
  const count = (predicate: (status: string) => boolean) =>
    teams.reduce(
      (total, team) =>
        total + team.sessions.filter((s) => predicate(s.status)).length,
      0
    );

  const active = count((s) => s === "in_progress");
  const completed = count((s) => s === "completed");
  const failed = count((s) => s === "failed");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Teams" value={teams.length} />
        <Stat label="Active" value={active} tone="text-gold" />
        <Stat label="Solved" value={completed} tone="text-success" />
        <Stat label="Failed" value={failed} tone="text-error" />
      </div>

      <Card title="Event controls">
        <div className="flex flex-wrap gap-2">
          {event.status === "draft" && (
            <Button size="sm" onClick={() => onEventStatusChange("open")}>
              Open registrations
            </Button>
          )}
          {event.status === "open" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEventStatusChange("paused")}
            >
              Pause event
            </Button>
          )}
          {event.status === "paused" && (
            <Button size="sm" onClick={() => onEventStatusChange("open")}>
              Resume event
            </Button>
          )}
          {event.status === "closed" && (
            <Button size="sm" onClick={() => onEventStatusChange("open")}>
              Reopen event
            </Button>
          )}
          {event.status !== "closed" && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onEventStatusChange("closed")}
            >
              Close event
            </Button>
          )}
        </div>
      </Card>

      <Card title="Progress by case">
        <div className="space-y-4">
          {MYSTERY_IDS.map((mysteryId) => {
            const solved = teams.filter((team) =>
              team.sessions.some(
                (s) => s.mysteryId === mysteryId && s.status === "completed"
              )
            ).length;
            const inProgress = teams.filter((team) =>
              team.sessions.some(
                (s) => s.mysteryId === mysteryId && s.status === "in_progress"
              )
            ).length;
            const percent = teams.length
              ? Math.round((solved / teams.length) * 100)
              : 0;

            return (
              <div key={mysteryId}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="text-text-secondary">
                    {MYSTERY_NAMES[mysteryId] || mysteryId}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {solved} solved · {inProgress} active
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded bg-ink-600"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${MYSTERY_NAMES[mysteryId]} completion`}
                >
                  <div
                    className="h-full rounded bg-accent transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
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
