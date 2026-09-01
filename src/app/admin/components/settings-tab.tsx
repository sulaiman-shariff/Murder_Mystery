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
  proofBonus: number;
  alibiBonusPerBreak: number;
  alibiBonusCap: number;
  boardAccuracyBonus: number;
  interrogationBonus: number;
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

/** The optional deduction tools. These only ever add to a score. */
const BONUS_FIELDS: {
  key: keyof SettingsForm;
  label: string;
  help: string;
}[] = [
  { key: "proofBonus", label: "Clean proof", help: "For proving it with no stray picks" },
  { key: "alibiBonusPerBreak", label: "Per alibi broken", help: "Added for each alibi they break" },
  { key: "alibiBonusCap", label: "Alibi bonus cap", help: "Most that alibi-breaking can earn" },
  { key: "boardAccuracyBonus", label: "Case board", help: "Scaled by how accurate the board is" },
  { key: "interrogationBonus", label: "Cracked a suspect", help: "For making one crack under questioning" },
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
  saving,
}: {
  form: SettingsForm;
  onChange: (next: SettingsForm) => void;
  onSave: () => void;
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

      <Card title="Deduction bonuses">
        <p className="mb-4 text-sm text-text-secondary">
          Earned by the optional tools. They only ever add — set any to zero to
          switch that reward off.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {BONUS_FIELDS.map((field) => (
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
