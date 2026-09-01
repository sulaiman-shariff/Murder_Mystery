"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DEFAULT_SCORING } from "@/lib/game/scoring";
import { authedFetch, UnauthorizedError, STATUS_LABELS, MYSTERY_NAMES } from "./lib";
import { LoginScreen } from "./components/login-screen";
import { DashboardTab } from "./components/dashboard-tab";
import { TeamsTab } from "./components/teams-tab";
import { SettingsTab, type SettingsForm } from "./components/settings-tab";
import { AiLogsTab } from "./components/ai-logs-tab";
import { LeaderboardTab } from "./components/leaderboard-tab";
import type {
  AdminAiLog,
  AdminEvent,
  AdminTeam,
  EventStatus,
  LeaderboardEntry,
} from "@/types";

type TabId = "dashboard" | "teams" | "settings" | "ai-logs" | "leaderboard";

const TABS: TabItem<TabId>[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "teams", label: "Teams" },
  { id: "settings", label: "Settings" },
  { id: "ai-logs", label: "AI Logs" },
  { id: "leaderboard", label: "Leaderboard" },
];

const STATUS_TONE: Record<string, "default" | "success" | "gold" | "error"> = {
  draft: "default",
  open: "success",
  paused: "gold",
  closed: "error",
};

const DEFAULT_FORM: SettingsForm = {
  ...DEFAULT_SCORING,
  maxAttempts: 10,
  currentMysteryLimit: 3,
};

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState("");
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [aiLogs, setAiLogs] = useState<AdminAiLog[]>([]);
  const [aiFilter, setAiFilter] = useState({ teamId: "", type: "" });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_FORM);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "gold" | "error";
  } | null>(null);

  const selectedEvent = events.find((e) => e.eventCode === selectedEventCode);

  useEffect(() => {
    setSelectedEventCode(process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "");
  }, []);

  const announce = useCallback((text: string, tone: "gold" | "error" = "gold") => {
    setNotice({ text, tone });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  /**
   * Every admin request funnels through here: an expired session drops back
   * to the login screen once, and anything else surfaces as a visible
   * message instead of failing silently.
   */
  const run = useCallback(
    async <T,>(
      task: () => Promise<T>,
      options: { errorMessage: string; successMessage?: string } = {
        errorMessage: "Something went wrong",
      }
    ): Promise<T | null> => {
      try {
        const result = await task();
        if (options.successMessage) announce(options.successMessage);
        return result;
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          setAuthenticated(false);
          return null;
        }
        console.error(options.errorMessage, err);
        announce(
          err instanceof Error ? err.message : options.errorMessage,
          "error"
        );
        return null;
      }
    },
    [announce]
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        setAuthenticated(true);
        setPasscode("");
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "That passcode was not accepted.");
      }
    } catch {
      setLoginError("Could not reach the server.");
    } finally {
      setLoggingIn(false);
    }
  }

  const loadEvents = useCallback(async () => {
    const data = await run(
      () => authedFetch<{ events: AdminEvent[] }>("/api/admin/events"),
      { errorMessage: "Could not load events" }
    );
    if (!data?.events) return;
    setEvents(data.events);
    setSelectedEventCode((current) =>
      data.events.some((e) => e.eventCode === current)
        ? current
        : (data.events[0]?.eventCode ?? "")
    );
  }, [run]);

  const loadTeams = useCallback(async () => {
    if (!selectedEventCode) return;
    setBusy(true);
    const data = await run(
      () =>
        authedFetch<{ teams: AdminTeam[] }>(
          `/api/admin/teams?eventCode=${encodeURIComponent(selectedEventCode)}`
        ),
      { errorMessage: "Could not load teams" }
    );
    if (data) setTeams(data.teams || []);
    setBusy(false);
  }, [selectedEventCode, run]);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedEventCode) return;
    const data = await run(
      () =>
        authedFetch<{ leaderboard: LeaderboardEntry[] }>(
          `/api/admin/leaderboard?eventCode=${encodeURIComponent(selectedEventCode)}`
        ),
      { errorMessage: "Could not load the leaderboard" }
    );
    if (data) setLeaderboard(data.leaderboard || []);
  }, [selectedEventCode, run]);

  const loadAiLogs = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (aiFilter.teamId) params.set("teamId", aiFilter.teamId);
    if (aiFilter.type) params.set("type", aiFilter.type);

    setBusy(true);
    const data = await run(
      () =>
        authedFetch<{ interactions: AdminAiLog[] }>(
          `/api/admin/ai-interactions?${params}`
        ),
      { errorMessage: "Could not load AI logs" }
    );
    if (data) setAiLogs(data.interactions || []);
    setBusy(false);
  }, [aiFilter, run]);

  useEffect(() => {
    if (authenticated) void loadEvents();
  }, [authenticated, loadEvents]);

  useEffect(() => {
    if (authenticated && selectedEventCode) {
      void loadTeams();
      void loadLeaderboard();
    }
  }, [authenticated, selectedEventCode, loadTeams, loadLeaderboard]);

  useEffect(() => {
    if (authenticated && activeTab === "ai-logs") void loadAiLogs();
  }, [authenticated, activeTab, loadAiLogs]);

  // Mirror the selected event's saved settings into the editable form.
  useEffect(() => {
    if (!selectedEvent) return;
    setSettingsForm({
      ...DEFAULT_SCORING,
      ...(selectedEvent.scoringSettings ?? {}),
      maxAttempts: selectedEvent.maxAttempts || 10,
      currentMysteryLimit: selectedEvent.currentMysteryLimit || 3,
    });
  }, [selectedEvent]);

  async function updateEvent(
    body: Record<string, unknown>,
    successMessage: string
  ) {
    const data = await run(
      () =>
        authedFetch<{ event: AdminEvent }>("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventCode: selectedEventCode, ...body }),
        }),
      { errorMessage: "Could not update the event", successMessage }
    );
    if (data?.event) {
      setEvents((prev) =>
        prev.map((e) => (e.eventCode === selectedEventCode ? data.event : e))
      );
    }
  }

  async function postAction(
    url: string,
    body: Record<string, unknown> | undefined,
    successMessage: string,
    after?: () => void
  ) {
    const result = await run(
      () =>
        authedFetch<{ success?: boolean }>(url, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        }),
      { errorMessage: "That action failed", successMessage }
    );
    if (result !== null) after?.();
  }

  async function handleExportCSV() {
    try {
      const res = await fetch(
        `/api/admin/leaderboard?eventCode=${encodeURIComponent(selectedEventCode)}&format=csv`
      );
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leaderboard-${selectedEventCode}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      announce("Could not export the CSV", "error");
    }
  }

  if (!authenticated) {
    return (
      <LoginScreen
        passcode={passcode}
        onPasscodeChange={setPasscode}
        onSubmit={handleLogin}
        loading={loggingIn}
        error={loginError}
      />
    );
  }

  return (
    <div className="screen-pad-y-tight flex min-h-dvh flex-col px-4">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl uppercase tracking-[0.15em] text-accent">
            Records Office
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="flex min-h-11 items-center px-3 font-display text-xs uppercase tracking-[0.15em] text-text-muted transition-colors hover:text-gold"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => setAuthenticated(false)}
              className="flex min-h-11 items-center px-3 font-display text-xs uppercase tracking-[0.15em] text-error transition-colors hover:text-accent-light"
            >
              Lock
            </button>
          </div>
        </header>

        <div className="mb-4">
          <label
            htmlFor="event-select"
            className="mb-1 block font-display text-[11px] uppercase tracking-[0.15em] text-text-muted"
          >
            Event
          </label>
          <select
            id="event-select"
            value={selectedEventCode}
            onChange={(e) => setSelectedEventCode(e.target.value)}
            className="min-h-11 w-full rounded border border-border-dark bg-ink-800 px-3 py-2 text-base text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {events.length === 0 && <option value="">No events found</option>}
            {events.map((event) => (
              <option key={event.id} value={event.eventCode}>
                {event.name} ({event.eventCode})
              </option>
            ))}
          </select>
          {selectedEvent && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[selectedEvent.status] || "default"}>
                {STATUS_LABELS[selectedEvent.status] || selectedEvent.status}
              </Badge>
              <span className="text-sm text-text-muted">
                {selectedEvent.name}
              </span>
            </div>
          )}
        </div>

        {/* Reserved so a notice appearing does not shove the tabs down. */}
        <div className="mb-3 min-h-[52px]">
          {notice && (
            <Card
              tone={notice.tone === "error" ? "error" : "gold"}
              className="animate-rise py-2.5"
            >
              <p
                role="status"
                className={`text-sm ${notice.tone === "error" ? "text-error" : "text-gold"}`}
              >
                {notice.text}
              </p>
            </Card>
          )}
        </div>

        <div className="-mx-4 mb-4 border-b border-border-dark">
          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "dashboard" &&
          (selectedEvent ? (
            <DashboardTab
              event={selectedEvent}
              teams={teams}
              onEventStatusChange={(status) =>
                updateEvent(
                  { status: status as EventStatus },
                  `Event ${STATUS_LABELS[status]?.toLowerCase() ?? status}`
                )
              }
            />
          ) : (
            <Card className="py-8 text-center">
              <p className="text-sm text-text-muted">
                Select an event to see its dashboard.
              </p>
            </Card>
          ))}

        {activeTab === "teams" && (
          <TeamsTab
            teams={teams}
            loading={busy}
            onRefresh={() => void loadTeams()}
            onResetMystery={(teamId, mysteryId) =>
              void postAction(
                "/api/admin/teams/reset",
                { teamId, mysteryId },
                `Reset ${MYSTERY_NAMES[mysteryId] || mysteryId}`,
                () => void loadTeams()
              )
            }
            onResetAll={(teamId) => {
              if (!confirm("Reset every case for this team?")) return;
              void postAction(
                "/api/admin/teams/reset-all",
                { teamId },
                "All cases reset",
                () => void loadTeams()
              );
            }}
            onResetPin={(teamId, newPin) =>
              void postAction(
                "/api/admin/teams/reset-pin",
                { teamId, newPin },
                "PIN updated",
                () => void loadTeams()
              )
            }
            onDeleteTeam={(teamId, name) => {
              if (!confirm(`Delete "${name}" and everything they have done?`))
                return;
              void postAction(
                "/api/admin/delete-team",
                { teamId },
                `Deleted ${name}`,
                () => setTeams((prev) => prev.filter((t) => t.id !== teamId))
              );
            }}
          />
        )}

        {activeTab === "settings" &&
          (selectedEvent ? (
            <SettingsTab
              form={settingsForm}
              onChange={setSettingsForm}
              saving={busy}
              onSave={() => {
                const {
                  maxAttempts,
                  currentMysteryLimit,
                  ...scoringSettings
                } = settingsForm;
                void updateEvent(
                  { scoringSettings, maxAttempts, currentMysteryLimit },
                  "Settings saved"
                );
              }}
              onClearData={() => {
                if (
                  !confirm(
                    "Delete ALL teams, sessions and AI logs? This cannot be undone."
                  )
                )
                  return;
                void postAction(
                  "/api/admin/clear",
                  undefined,
                  "All data cleared",
                  () => {
                    setTeams([]);
                    setAiLogs([]);
                    setLeaderboard([]);
                  }
                );
              }}
            />
          ) : (
            <Card className="py-8 text-center">
              <p className="text-sm text-text-muted">
                Select an event to edit its settings.
              </p>
            </Card>
          ))}

        {activeTab === "ai-logs" && (
          <AiLogsTab
            logs={aiLogs}
            teams={teams}
            filter={aiFilter}
            onFilterChange={setAiFilter}
            onRefresh={() => void loadAiLogs()}
            loading={busy}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardTab
            entries={leaderboard}
            onRefresh={() => void loadLeaderboard()}
            onExport={() => void handleExportCSV()}
            loading={busy}
          />
        )}
      </div>
    </div>
  );
}
