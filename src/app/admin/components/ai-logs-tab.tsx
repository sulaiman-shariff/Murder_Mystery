"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { AI_TYPE_LABELS } from "../lib";
import type { AdminAiLog, AdminTeam } from "@/types";

export function AiLogsTab({
  logs,
  teams,
  filter,
  onFilterChange,
  onRefresh,
  loading,
}: {
  logs: AdminAiLog[];
  teams: AdminTeam[];
  filter: { teamId: string; type: string };
  onFilterChange: (next: { teamId: string; type: string }) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          label="Type"
          value={filter.type}
          onChange={(type) => onFilterChange({ ...filter, type })}
          options={[
            { value: "", label: "All types" },
            ...Object.entries(AI_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <Select
          label="Team"
          value={filter.teamId}
          onChange={(teamId) => onFilterChange({ ...filter, teamId })}
          options={[
            { value: "", label: "All teams" },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
          ]}
        />
        <div className="flex items-end">
          <Button size="sm" variant="ghost" onClick={onRefresh} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <Card className="py-8 text-center">
          <p className="text-sm text-text-muted">
            No AI interactions match these filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => {
            const isOpen = expanded === log.id;
            return (
              <div
                key={log.id}
                className="overflow-hidden rounded border border-border-dark bg-ink-800"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                  aria-expanded={isOpen}
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left"
                >
                  <Badge tone="accent">
                    {AI_TYPE_LABELS[log.type] || log.type}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                    {log.player_input?.slice(0, 90) || "(no input)"}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-text-muted">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <ChevronIcon
                    className={cn(
                      "h-4 w-4 shrink-0 text-text-muted transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="animate-rise space-y-3 border-t border-border-dark px-3 py-3">
                    <LogField label="Player said" text={log.player_input} />
                    <LogField label="AI replied" text={log.ai_output} scroll />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogField({
  label,
  text,
  scroll = false,
}: {
  label: string;
  text: string;
  scroll?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "whitespace-pre-wrap text-sm leading-relaxed text-text-secondary",
          scroll && "max-h-48 overflow-y-auto"
        )}
      >
        {text || "(empty)"}
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block min-h-11 rounded border border-border-dark bg-ink-800 px-2 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
