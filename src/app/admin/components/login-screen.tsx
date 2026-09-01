"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stamp } from "@/components/ui/stamp";

export function LoginScreen({
  passcode,
  onPasscodeChange,
  onSubmit,
  loading,
  error,
}: {
  passcode: string;
  onPasscodeChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Stamp tone="accent">Restricted</Stamp>
          <h1 className="mt-6 font-display text-2xl uppercase tracking-[0.15em] text-text-primary">
            Records Office
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Staff only. Enter the passcode to manage the event.
          </p>
        </div>

        <Card>
          <form onSubmit={onSubmit}>
            <Input
              label="Passcode"
              type="password"
              value={passcode}
              onChange={(e) => onPasscodeChange(e.target.value)}
              placeholder="Admin passcode"
              autoFocus
              required
              error={error || undefined}
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Unlock
            </Button>
          </form>
        </Card>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-text-muted">
          Murder Mystery v3
        </p>
      </div>
    </div>
  );
}
