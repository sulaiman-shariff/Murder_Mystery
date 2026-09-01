"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface SettingsForm {
  baseScore: number;
  wrongAttemptPenalty: number;
  hintPenalty: number;
  timePenaltyPerMinute: number;
  speedBonusThresholdMinutes: number;
  speedBonus: number;
  minimumScore: number;
  maxAttempts: number;
  currentMysteryLimit: number;
}

const SCORING_FIELDS: {
  key: keyof SettingsForm;
  label: string;
  help: string;
}[] = [
  { key: "baseScore", label: "Base score", help: "Points a perfect case is worth" },
  { key: "wrongAttemptPenalty", label: "Wrong accusation", help: "Deducted per wrong answer" },
  { key: "hintPenalty", label: "Hint", help: "Deducted per hint taken" },
  { key: "timePenaltyPerMinute", label: "Time / minute", help: "Deducted for every minute elapsed" },
  { key: "speedBonusThresholdMinutes", label: "Speed bonus under", help: "Minutes to beat for the bonus" },
  { key: "speedBonus", label: "Speed bonus", help: "Added when they beat that time" },
  { key: "minimumScore", label: "Minimum score", help: "A solved case never scores below this" },
];

const EVENT_FIELDS: {
  key: keyof SettingsForm;
  label: string;
  help: string;
}[] = [
  { key: "maxAttempts", label: "Max attempts", help: "Wrong answers before a case fails" },
  { key: "currentMysteryLimit", label: "Cases available", help: "How many cases teams can reach" },
];

export function SettingsTab({
  form,
  onChange,
  onSave,
  onClearData,
  saving,
}: {
  form: SettingsForm;
  onChange: (next: SettingsForm) => void;
  onSave: () => void;
  onClearData: () => void;
  saving: boolean;
}) {
  function setField(key: keyof SettingsForm, value: string) {
    const parsed = parseInt(value, 10);
    onChange({ ...form, [key]: Number.isNaN(parsed) ? 0 : parsed });
  }

  return (
    <div className="space-y-3">
      <Card title="Scoring">
        <div className="grid gap-4 sm:grid-cols-2">
          {SCORING_FIELDS.map((field) => (
            <NumberField
              key={field.key}
              id={field.key}
              label={field.label}
              help={field.help}
              value={form[field.key]}
              onChange={(value) => setField(field.key, value)}
            />
          ))}
        </div>
      </Card>

      <Card title="Event rules">
        <div className="grid gap-4 sm:grid-cols-2">
          {EVENT_FIELDS.map((field) => (
            <NumberField
              key={field.key}
              id={field.key}
              label={field.label}
              help={field.help}
              value={form[field.key]}
              onChange={(value) => setField(field.key, value)}
            />
          ))}
        </div>
        <Button
          fullWidth
          size="lg"
          className="mt-5"
          onClick={onSave}
          loading={saving}
        >
          Save settings
        </Button>
      </Card>

      <Card tone="error" title="Danger zone">
        <p className="mb-3 text-sm text-text-secondary">
          Deletes every team, session and AI log for all events. There is no
          undo.
        </p>
        <Button variant="danger" fullWidth onClick={onClearData}>
          Delete all data
        </Button>
      </Card>
    </div>
  );
}

function NumberField({
  id,
  label,
  help,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-display text-[11px] uppercase tracking-[0.15em] text-text-secondary"
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-11 w-full rounded border border-border-dark bg-ink-900 px-3 py-2 font-mono text-base tabular-nums text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <p className="mt-1 text-xs text-text-muted">{help}</p>
    </div>
  );
}
