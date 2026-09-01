"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Type-to-confirm for anything destructive.
 *
 * Replaces window.confirm, which a stray double-tap dismisses and which cannot
 * say what the action's scope actually is. Every use states in words what will
 * be destroyed and what will not.
 */
export function ConfirmAction({
  title,
  scopeLine,
  detail,
  phrase,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
}: {
  title: string;
  /** Plain English: what this touches, and what it leaves alone. */
  scopeLine: string;
  detail?: string;
  /** What must be typed exactly — an event code or a team name. */
  phrase: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === phrase;

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!matches}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card tone="error">
          <p className="text-[15px] leading-relaxed text-text-secondary">
            {scopeLine}
          </p>
          {detail && (
            <p className="mt-2 font-mono text-xs text-text-muted">{detail}</p>
          )}
        </Card>

        <Input
          label={`Type ${phrase} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={phrase}
          autoFocus
          autoCapitalize="characters"
        />
      </div>
    </Sheet>
  );
}
