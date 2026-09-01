"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Stamp } from "@/components/ui/stamp";
import { MagnifierIcon } from "@/components/ui/icons";
import {
  saveTeam,
  getTeam,
  clearTeam,
  getCompletedMysteries,
} from "@/lib/storage/local";
import { getMysteryByOrder } from "@/data/mystery-index";
import { cn } from "@/lib/cn";

type TabMode = "login" | "register";

const HOW_TO_PLAY = [
  {
    title: "Read the file",
    body: "Start with the case summary and the victim, then work through the story sections.",
  },
  {
    title: "Examine the evidence",
    body: "Mark anything that matters with the star. Marked evidence stays flagged across the case.",
  },
  {
    title: "Interview the suspects",
    body: "Compare statements against alibis and keep notes on each one as you go.",
  },
  {
    title: "Consult the detective",
    body: "Ask questions any time. Request a hint when you are stuck — hints cost points.",
  },
  {
    title: "Name the killer",
    body: "Submit the murderer and their motive together. Both must be right to close the case.",
  },
];

export default function HomePage() {
  const [mode, setMode] = useState<TabMode>("login");
  const [teamName, setTeamName] = useState("");
  const [pin, setPin] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedTeamName, setSavedTeamName] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const team = getTeam();
    if (team) {
      setSavedTeamName(team.name);
      setTeamName(team.name);
      setEventCode(team.eventCode);
    } else {
      setEventCode(process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (mode !== "register" || !teamName.trim() || !eventCode.trim()) {
      setNameAvailable(null);
      setCheckingName(false);
      return;
    }
    setCheckingName(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/teams/check?name=${encodeURIComponent(teamName)}&eventCode=${encodeURIComponent(eventCode)}`
        );
        const data = await res.json();
        setNameAvailable(data.available);
      } catch {
        setNameAvailable(null);
      }
      setCheckingName(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [teamName, eventCode, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint =
        mode === "register" ? "/api/teams/register" : "/api/teams/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, pin, eventCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      saveTeam({
        id: data.team.id,
        name: teamName,
        pin,
        eventId: data.team.eventId || eventCode,
        eventCode,
      });

      window.location.href = `/play/${data.nextMysteryId || "gilded-rose-mansion"}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function handleContinue() {
    const team = getTeam();
    if (!team) return;
    const completedCount = Object.keys(getCompletedMysteries()).length;
    const nextMystery = getMysteryByOrder(completedCount + 1);
    window.location.href = nextMystery
      ? `/play/${nextMystery.id}`
      : "/play/gilded-rose-mansion";
  }

  function handleLogout() {
    clearTeam();
    setSavedTeamName(null);
    setTeamName("");
    setPin("");
    setEventCode(process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "");
  }

  const nameHint =
    mode === "register" && teamName.trim()
      ? checkingName
        ? "Checking availability…"
        : nameAvailable === true
          ? "That name is free."
          : nameAvailable === false
            ? "Another team already took that name."
            : " "
      : " ";

  return (
    <div className="screen-pad-y flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* The file cover: the most characteristic object in this world. */}
        <div className="paper-grain relative mb-8 overflow-hidden rounded-card border border-paper-dim/30 bg-paper px-5 pb-6 pt-5 shadow-lift">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink-700/70">
                Case File
              </p>
              <h1 className="mt-1 font-display text-3xl leading-[1.05] tracking-tight text-ink-900">
                MURDER
                <br />
                MYSTERY
              </h1>
            </div>
            <MagnifierIcon className="mt-1 h-7 w-7 shrink-0 text-ink-900/45" />
          </div>

          <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink-900/15 pt-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-700/70">
              Three cases
              <br />
              One culprit each
            </p>
            <Stamp tone="accent" className="mb-1 text-[11px]">
              Confidential
            </Stamp>
          </div>
        </div>

        {/* Held open only until localStorage has been read, so a returning
            team's card does not shove the form down; collapsed afterwards
            rather than leaving a permanent gap for everyone else. */}
        <div className={hydrated && !savedTeamName ? "" : "mb-4 min-h-[84px]"}>
          {hydrated && savedTeamName && (
            <Card tone="accent" className="animate-fade">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
                    Active file
                  </p>
                  <p className="truncate text-sm font-bold text-text-primary">
                    {savedTeamName}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={handleContinue}>
                    Resume
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleLogout}>
                    Sign out
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <Card>
          <div
            role="tablist"
            aria-label="Sign in or register"
            className="mb-4 grid grid-cols-2 overflow-hidden rounded border border-border-dark"
          >
            {(
              [
                { id: "login", label: "Sign In" },
                { id: "register", label: "New Team" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={mode === tab.id}
                onClick={() => setMode(tab.id)}
                className={cn(
                  "min-h-11 px-3 py-2.5 font-display text-[13px] uppercase tracking-[0.12em] transition-colors",
                  mode === tab.id
                    ? "bg-accent text-white"
                    : "bg-ink-800 text-text-muted hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <Input
              label="Event Code"
              placeholder="ATRIA"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              autoCapitalize="characters"
              required
            />
            <Input
              label="Team Name"
              placeholder="Name your team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              maxLength={30}
              hint={nameHint}
              hintTone={
                nameAvailable === true
                  ? "success"
                  : nameAvailable === false
                    ? "error"
                    : "muted"
              }
            />
            <Input
              label="PIN"
              type="password"
              placeholder="Your team PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              maxLength={20}
            />

            {error && (
              <p role="alert" className="mb-2 text-center text-xs text-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={mode === "register" && nameAvailable === false}
            >
              {mode === "register" ? "Open the file" : "Resume the case"}
            </Button>
          </form>
        </Card>

        <div className="mt-5 flex justify-center gap-2">
          <a
            href="/leaderboard"
            className="min-h-11 px-3 py-3 font-display text-xs uppercase tracking-[0.15em] text-text-muted transition-colors hover:text-gold"
          >
            Leaderboard
          </a>
          <button
            type="button"
            onClick={() => setShowHowToPlay((open) => !open)}
            aria-expanded={showHowToPlay}
            className="min-h-11 px-3 py-3 font-display text-xs uppercase tracking-[0.15em] text-text-muted transition-colors hover:text-gold"
          >
            How to Play
          </button>
        </div>

        {showHowToPlay && (
          <Card className="animate-rise mt-3" title="How to Play">
            <ol className="space-y-3">
              {HOW_TO_PLAY.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 font-mono text-xs text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {step.title}
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-border-dark pt-3 text-xs text-text-muted">
              Your score falls with time, wrong accusations and hints used.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
