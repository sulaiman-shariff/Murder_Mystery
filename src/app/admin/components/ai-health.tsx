"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface AiHealth {
  gemini: {
    status: "ready" | "unavailable";
    model: string;
    latencyMs?: number;
    reason?: string;
    cached: boolean;
  };
  recent: {
    windowMinutes: number;
    total: number;
    fallbackRate: number;
    unavailableCount: number;
  };
}

/**
 * Whether the AI is actually answering.
 *
 * When the model broke earlier in this project the only symptom was players
 * saying validation "wasn't working" — there was nothing an operator could
 * look at.
 */
export function AiHealthStrip({
  health,
  onRecheck,
  busy,
}: {
  health: AiHealth | null;
  onRecheck: () => void;
  busy: boolean;
}) {
  const ready = health?.gemini.status === "ready";

  return (
    <Card tone={health && !ready ? "error" : "default"}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={!health ? "default" : ready ? "success" : "error"}>
          {!health ? "Checking" : ready ? "AI ready" : "AI down"}
        </Badge>

        {health && (
          <span className="font-mono text-xs text-text-muted">
            {health.gemini.model}
            {health.gemini.latencyMs ? ` · ${health.gemini.latencyMs}ms` : ""}
            {health.gemini.reason ? ` · ${health.gemini.reason}` : ""}
          </span>
        )}

        {health && health.recent.total > 0 && (
          <span className="font-mono text-xs text-text-muted">
            {health.recent.total} calls in {health.recent.windowMinutes}m
            {health.recent.fallbackRate > 0
              ? ` · ${Math.round(health.recent.fallbackRate * 100)}% fell back`
              : ""}
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          loading={busy}
          onClick={onRecheck}
        >
          Test now
        </Button>
      </div>
    </Card>
  );
}
