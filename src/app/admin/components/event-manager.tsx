"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { STATUS_LABELS } from "../lib";
import type { AdminEvent } from "@/types";

const STATUS_TONE: Record<string, "default" | "success" | "gold" | "error"> = {
  draft: "default",
  open: "success",
  paused: "gold",
  closed: "error",
};

export function EventManager({
  events,
  selected,
  teamCount,
  onSelect,
  onCreate,
  onDuplicate,
  onUpdate,
  onDelete,
  busy,
}: {
  events: AdminEvent[];
  selected: AdminEvent | undefined;
  teamCount: number;
  onSelect: (eventCode: string) => void;
  onCreate: (name: string, eventCode: string) => void;
  onDuplicate: (sourceId: string, name: string, eventCode: string) => void;
  onUpdate: (id: string, changes: Record<string, unknown>) => void;
  onDelete: (event: AdminEvent) => void;
  busy: boolean;
}) {
  const [sheet, setSheet] = useState<"create" | "duplicate" | "rename" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  function open(kind: "create" | "duplicate" | "rename") {
    setName(kind === "rename" ? (selected?.name ?? "") : "");
    setCode(kind === "rename" ? (selected?.eventCode ?? "") : "");
    setSheet(kind);
  }

  function submit() {
    if (sheet === "create") onCreate(name, code);
    if (sheet === "duplicate" && selected) onDuplicate(selected.id, name, code);
    if (sheet === "rename" && selected) {
      onUpdate(selected.id, { name, eventCode: code });
    }
    setSheet(null);
  }

  return (
    <div className="space-y-3">
      <Card title="Events">
        <ul className="space-y-2">
          {events.map((event) => {
            const isSelected = event.id === selected?.id;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event.eventCode)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/10"
                      : "border-border-dark hover:border-border-mid"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base text-text-primary">
                      {event.name}
                    </span>
                    <span className="block font-mono text-xs uppercase tracking-wider text-text-muted">
                      {event.eventCode}
                    </span>
                  </span>
                  <Badge tone={STATUS_TONE[event.status] ?? "default"}>
                    {STATUS_LABELS[event.status] ?? event.status}
                  </Badge>
                </button>
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="py-4 text-center text-sm text-text-muted">
              No events yet. Create one to get started.
            </li>
          )}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-dark pt-4">
          <Button size="sm" onClick={() => open("create")}>
            New event
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!selected}
            onClick={() => open("duplicate")}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!selected}
            onClick={() => open("rename")}
          >
            Rename / re-code
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={!selected}
            onClick={() => selected && onDelete(selected)}
          >
            Delete event
          </Button>
        </div>
      </Card>

      {selected && (
        <Card title="Registration">
          <p className="mb-3 text-sm text-text-secondary">
            Teams can only join and play while an event is{" "}
            <strong className="text-text-primary">open</strong>. Pausing or
            closing it stops both immediately.
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.status !== "open" && (
              <Button
                size="sm"
                loading={busy}
                onClick={() => onUpdate(selected.id, { status: "open" })}
              >
                Open for teams
              </Button>
            )}
            {selected.status === "open" && (
              <Button
                size="sm"
                variant="secondary"
                loading={busy}
                onClick={() => onUpdate(selected.id, { status: "paused" })}
              >
                Pause
              </Button>
            )}
            {selected.status !== "closed" && (
              <Button
                size="sm"
                variant="danger"
                loading={busy}
                onClick={() => onUpdate(selected.id, { status: "closed" })}
              >
                Close event
              </Button>
            )}
          </div>
        </Card>
      )}

      {sheet && (
        <Sheet
          title={
            sheet === "create"
              ? "New event"
              : sheet === "duplicate"
                ? "Duplicate event"
                : "Rename or re-code"
          }
          onClose={() => setSheet(null)}
          footer={
            <Button
              fullWidth
              size="lg"
              disabled={!code.trim()}
              loading={busy}
              onClick={submit}
            >
              {sheet === "create"
                ? "Create"
                : sheet === "duplicate"
                  ? "Duplicate"
                  : "Save"}
            </Button>
          }
        >
          <div className="space-y-1">
            <Input
              label="Event name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday night at the Ashcombe"
            />
            <Input
              label="Join code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ATRIA26"
              autoCapitalize="characters"
              hint="What teams type to join. Letters, numbers and dashes, 3–24 characters."
            />
            {sheet === "duplicate" && (
              <p className="text-sm text-text-muted">
                Copies the scoring and rules only. No teams and no progress come
                across.
              </p>
            )}
            {sheet === "rename" && teamCount > 0 && selected?.status !== "draft" && (
              <p className="text-sm text-error">
                {teamCount} team{teamCount === 1 ? " has" : "s have"} already
                joined with the current code. Changing it means the old code
                stops working.
              </p>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
