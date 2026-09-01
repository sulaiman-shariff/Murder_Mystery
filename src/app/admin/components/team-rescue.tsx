"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MYSTERY_NAMES, formatTime } from "../lib";
import type { MonitorTeam } from "./live-monitor";

/**
 * Fixing a team mid-event.
 *
 * The point of this sheet is that none of it destroys their work. Until it
 * existed, a team locked out by exhausted attempts could only be freed by a
 * reset that also blanked their notes and their board — an hour of
 * investigation thrown away to undo one bad guess.
 */
export function TeamRescue({
  team,
  onClose,
  onAdjust,
  onResetCase,
  onResetTeam,
  onDelete,
  busy,
}: {
  team: MonitorTeam;
  onClose: () => void;
  onAdjust: (changes: Record<string, unknown>) => void;
  onResetCase: (mysteryId: string) => void;
  onResetTeam: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  const current = team.current;

  return (
    <Sheet
      title={team.teamName}
      meta={current ? `${team.solved} solved` : undefined}
      onClose={onClose}
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {current ? (
          <Card title="Where they are">
            <p className="font-display text-base text-text-primary">
              {MYSTERY_NAMES[current.mysteryId] ?? current.mysteryId}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={current.status === "failed" ? "error" : "default"}>
                {current.status === "failed" ? "Locked out" : current.status}
              </Badge>
              <Badge>{formatTime(current.secondsOnCase)} on it</Badge>
              <Badge tone={current.attemptsRemaining <= 2 ? "error" : "default"}>
                {current.attemptsRemaining} attempts left
              </Badge>
              <Badge>{current.hintsUsed} hints</Badge>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-text-muted">
              This team has registered but not opened a case yet.
            </p>
          </Card>
        )}

        {current && (
          <>
            <Card title="Put them back in">
              <p className="mb-3 text-sm text-text-secondary">
                None of these touch their notes, evidence or case board.
              </p>
              <div className="flex flex-col gap-2">
                {current.status === "failed" && (
                  <Button
                    fullWidth
                    loading={busy}
                    onClick={() =>
                      onAdjust({
                        unfail: true,
                        grantAttempts: 3,
                        reason: reason || "Unlocked after running out of attempts",
                      })
                    }
                  >
                    Unlock and give 3 more attempts
                  </Button>
                )}
                <Button
                  variant="secondary"
                  fullWidth
                  loading={busy}
                  onClick={() =>
                    onAdjust({ grantAttempts: 3, reason: reason || "Extra attempts" })
                  }
                >
                  Give 3 more attempts
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  loading={busy}
                  onClick={() =>
                    onAdjust({ setHintsUsed: 0, reason: reason || "Hint penalty cleared" })
                  }
                >
                  Clear their hint penalty
                </Button>
              </div>

              <div className="mt-3">
                <Input
                  label="Why (kept in the log)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Validation was down when they answered"
                />
              </div>
            </Card>

            <Card tone="error" title="Start them over">
              <p className="mb-3 text-sm text-text-secondary">
                These do erase work. Resetting a case clears their notes and
                board for it.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => onResetCase(current.mysteryId)}
                >
                  Reset this case
                </Button>
                <Button variant="danger" fullWidth onClick={onResetTeam}>
                  Reset every case for this team
                </Button>
                <Button variant="danger" fullWidth onClick={onDelete}>
                  Delete the team
                </Button>
              </div>
            </Card>
          </>
        )}

        {!current && (
          <Card tone="error" title="Remove">
            <Button variant="danger" fullWidth onClick={onDelete}>
              Delete the team
            </Button>
          </Card>
        )}
      </div>
    </Sheet>
  );
}
