"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  saveTeam,
  getTeam,
  clearTeam,
  getCompletedMysteries,
} from "@/lib/storage/local";
import { getMysteryByOrder } from "@/data/mystery-index";

type TabMode = "login" | "register";

export default function HomePage() {
  const [mode, setMode] = useState<TabMode>("login");
  const [teamName, setTeamName] = useState("");
  const [pin, setPin] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [savedTeamName, setSavedTeamName] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);

  useEffect(() => {
    const team = getTeam();
    if (team) {
      setHasSession(true);
      setSavedTeamName(team.name);
      setTeamName(team.name);
      setEventCode(team.eventCode);
    } else {
      setEventCode(process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "");
    }
  }, []);

  useEffect(() => {
    if (mode !== "register" || !teamName.trim() || !eventCode.trim()) {
      setNameAvailable(null);
      return;
    }
    setCheckingName(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teams/check?name=${encodeURIComponent(teamName)}&eventCode=${encodeURIComponent(eventCode)}`);
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
      const endpoint = mode === "register" ? "/api/teams/register" : "/api/teams/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, pin, eventCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

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
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    const team = getTeam();
    if (team) {
      const completed = getCompletedMysteries();
      const completedCount = Object.keys(completed).length;
      const nextOrder = completedCount + 1;
      const nextMystery = getMysteryByOrder(nextOrder);
      window.location.href = nextMystery
        ? `/play/${nextMystery.id}`
        : "/play/gilded-rose-mansion";
    }
  }

  function handleLogout() {
    clearTeam();
    setHasSession(false);
    setSavedTeamName("");
    setTeamName("");
    setPin("");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-4xl">🔍</div>
          <h1 className="text-2xl font-bold tracking-wider text-accent">
            MURDER
            <br />
            MYSTERY
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-text-muted">
            The Detective&apos;s Challenge
          </p>
        </div>

        {hasSession && (
          <Card className="mb-4 border-accent/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Active Session</p>
                <p className="text-sm font-bold text-text-primary">
                  {savedTeamName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleContinue}>
                  Continue
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-4 flex rounded border border-border-dark">
            <button
              className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-accent text-white"
                  : "bg-dark-800 text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setMode("login")}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-accent text-white"
                  : "bg-dark-800 text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setMode("register")}
            >
              New Team
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Event Code"
              placeholder="DETECTIVE-2024"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              required
            />
            <div>
              <Input
                label="Team Name"
                placeholder="Enter your team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                maxLength={30}
              />
              {mode === "register" && teamName.trim() && (
                <p className={`mt-1 text-[10px] ${nameAvailable === true ? "text-success" : nameAvailable === false ? "text-error" : "text-text-muted"}`}>
                  {checkingName ? "Checking..." : nameAvailable === true ? "Name available" : nameAvailable === false ? "Name already taken" : ""}
                </p>
              )}
            </div>
            <Input
              label="PIN"
              type="password"
              placeholder="Enter your team PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              maxLength={20}
            />

            {error && (
              <p className="text-center text-xs text-error">{error}</p>
            )}

            <Button type="submit" fullWidth loading={loading} disabled={mode === "register" && nameAvailable === false}>
              {mode === "register"
                ? "Join the Investigation"
                : "Resume Investigation"}
            </Button>
          </form>
        </Card>

        <div className="mt-4 flex justify-center gap-4">
          <a
            href="/leaderboard"
            className="text-xs uppercase tracking-wider text-text-muted hover:text-gold transition-colors"
          >
            Leaderboard
          </a>
          <button
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            className="text-xs uppercase tracking-wider text-text-muted hover:text-gold transition-colors"
          >
            How to Play
          </button>
        </div>

        {showHowToPlay && (
          <Card className="mt-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gold">
              How to Play
            </h3>
            <div className="space-y-2 text-xs text-text-secondary">
              <div className="flex gap-2">
                <span className="text-accent">1.</span>
                <p>
                  <strong className="text-text-primary">Read the story</strong>{" "}
                  to understand the crime scene and meet the suspects.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-accent">2.</span>
                <p>
                  <strong className="text-text-primary">Examine evidence</strong>{" "}
                  and mark important clues by tapping the star icon.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-accent">3.</span>
                <p>
                  <strong className="text-text-primary">Interview suspects</strong>{" "}
                  and take notes on their statements and alibis.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-accent">4.</span>
                <p>
                  <strong className="text-text-primary">Ask the detective</strong>{" "}
                  for guidance or request hints when you&apos;re stuck.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-accent">5.</span>
                <p>
                  <strong className="text-text-primary">Solve the case</strong>{" "}
                  by identifying the murderer and their motive.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Your score depends on speed, wrong attempts, and hints used.
            </p>
          </Card>
        )}

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-text-muted">
          AI-Powered Murder Mystery
        </p>
      </div>
    </div>
  );
}
