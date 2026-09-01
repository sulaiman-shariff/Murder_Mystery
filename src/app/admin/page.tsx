"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DEFAULT_SCORING } from "@/lib/game/scoring";
import {
  authedFetch,
  UnauthorizedError,
  STATUS_LABELS,
  MYSTERY_NAMES,
  MYSTERY_IDS,
} from "./lib";
import { LoginScreen } from "./components/login-screen";
import { EventManager } from "./components/event-manager";
import { SettingsTab, type SettingsForm } from "./components/settings-tab";
import { TeamsTab } from "./components/teams-tab";
import { LiveMonitor, type MonitorTeam } from "./components/live-monitor";
import { TeamRescue } from "./components/team-rescue";
import { AiHealthStrip, type AiHealth } from "./components/ai-health";
import { LeaderboardTab } from "./components/leaderboard-tab";
import { AiLogsTab } from "./components/ai-logs-tab";
import { CaseFilesTab, type CaseFile } from "./components/case-files-tab";
import { ConfirmAction } from "./components/confirm-action";
import type {
  AdminAiLog,
  AdminEvent,
  AdminTeam,
  LeaderboardEntry,
} from "@/types";

/** Organised by what an operator is doing, not by which table the data is in. */
type TabId = "before" | "during" | "after" | "cases";

const TABS: TabItem<TabId>[] = [
  { id: "before", label: "Set up" },
  { id: "during", label: "Run" },
  { id: "after", label: "Results" },
  { id: "cases", label: "Case files" },
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

const MONITOR_REFRESH_MS = 10_000;

interface PendingConfirm {
  title: string;
  scopeLine: string;
  detail?: string;
  phrase: string;
  confirmLabel: string;
  run: () => Promise<unknown>;
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("during");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState("");
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [monitor, setMonitor] = useState<MonitorTeam[]>([]);
  const [counts, setCounts] = useState({ teams: 0, playing: 0, solved: 0, needHelp: 0 });
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [aiLogs, setAiLogs] = useState<AdminAiLog[]>([]);
  const [aiFilter, setAiFilter] = useState({ teamId: "", type: "" });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [loaded, setLoaded] = useState({ monitor: false, cases: false });
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_FORM);

  const [rescuing, setRescuing] = useState<MonitorTeam | null>(null);
  const [confirming, setConfirming] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "gold" | "error" } | null>(
    null
  );

  const selectedEvent = events.find((e) => e.eventCode === selectedEventCode);
  const monitorTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSelectedEventCode(process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "");
  }, []);

  const announce = useCallback((text: string, tone: "gold" | "error" = "gold") => {
    setNotice({ text, tone });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  /** Every admin call funnels through here: 401 drops to login, else a notice. */
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
        announce(err instanceof Error ? err.message : options.errorMessage, "error");
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

  // ── loaders ──

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

  const loadMonitor = useCallback(async () => {
    if (!selectedEventCode) return;
    const data = await run(
      () =>
        authedFetch<{ teams: MonitorTeam[]; counts: typeof counts }>(
          `/api/admin/monitor?eventCode=${encodeURIComponent(selectedEventCode)}`
        ),
      { errorMessage: "Could not load the monitor" }
    );
    if (data) {
      setMonitor(data.teams || []);
      setCounts(data.counts);
    }
    setLoaded((l) => ({ ...l, monitor: true }));
  }, [selectedEventCode, run]);

  const loadTeams = useCallback(async () => {
    if (!selectedEventCode) return;
    const data = await run(
      () =>
        authedFetch<{ teams: AdminTeam[] }>(
          `/api/admin/teams?eventCode=${encodeURIComponent(selectedEventCode)}&includePins=1`
        ),
      { errorMessage: "Could not load teams" }
    );
    if (data) setTeams(data.teams || []);
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

  const loadAiHealth = useCallback(
    async (force = false) => {
      const data = await run(
        () => authedFetch<AiHealth>(`/api/admin/ai-health${force ? "?force=1" : ""}`),
        { errorMessage: "Could not check the AI" }
      );
      if (data) setAiHealth(data);
    },
    [run]
  );

  const loadAiLogs = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (aiFilter.teamId) params.set("teamId", aiFilter.teamId);
    if (aiFilter.type) params.set("type", aiFilter.type);
    const data = await run(
      () => authedFetch<{ interactions: AdminAiLog[] }>(`/api/admin/ai-interactions?${params}`),
      { errorMessage: "Could not load AI logs" }
    );
    if (data) setAiLogs(data.interactions || []);
  }, [aiFilter, run]);

  const loadCaseFiles = useCallback(async () => {
    const data = await run(
      () => authedFetch<{ cases: CaseFile[] }>("/api/admin/case-files"),
      { errorMessage: "Could not load the case files" }
    );
    if (data) setCaseFiles(data.cases || []);
    setLoaded((l) => ({ ...l, cases: true }));
  }, [run]);

  useEffect(() => {
    if (authenticated) {
      void loadEvents();
      void loadAiHealth();
    }
  }, [authenticated, loadEvents, loadAiHealth]);

  useEffect(() => {
    if (authenticated && selectedEventCode) {
      setLoaded((l) => ({ ...l, monitor: false }));
      void loadMonitor();
      void loadTeams();
      void loadLeaderboard();
    }
  }, [authenticated, selectedEventCode, loadMonitor, loadTeams, loadLeaderboard]);

  // Live refresh, but only while the Run tab is actually on screen.
  useEffect(() => {
    if (monitorTimer.current) clearInterval(monitorTimer.current);
    if (!authenticated || activeTab !== "during") return;

    monitorTimer.current = setInterval(() => {
      if (document.visibilityState === "visible") void loadMonitor();
    }, MONITOR_REFRESH_MS);

    return () => {
      if (monitorTimer.current) clearInterval(monitorTimer.current);
    };
  }, [authenticated, activeTab, loadMonitor]);

  useEffect(() => {
    if (authenticated && activeTab === "after") void loadAiLogs();
    if (authenticated && activeTab === "cases") void loadCaseFiles();
  }, [authenticated, activeTab, loadAiLogs, loadCaseFiles]);

  useEffect(() => {
    if (!selectedEvent) return;
    setSettingsForm({
      ...DEFAULT_SCORING,
      ...(selectedEvent.scoringSettings ?? {}),
      maxAttempts: selectedEvent.maxAttempts || 10,
      currentMysteryLimit: selectedEvent.currentMysteryLimit || 3,
    });
  }, [selectedEvent]);

  // ── actions ──

  async function post<T>(url: string, body: unknown, success: string) {
    setBusy(true);
    const result = await run(
      () =>
        authedFetch<T>(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      { errorMessage: "That did not work", successMessage: success }
    );
    setBusy(false);
    return result;
  }

  async function refreshAll() {
    await Promise.all([loadEvents(), loadMonitor(), loadTeams(), loadLeaderboard()]);
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
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl uppercase tracking-[0.15em] text-accent">
              Records Office
            </h1>
            {selectedEvent && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[selectedEvent.status] || "default"}>
                  {STATUS_LABELS[selectedEvent.status] || selectedEvent.status}
                </Badge>
                <span className="font-mono text-xs text-text-muted">
                  {selectedEvent.name} · {selectedEvent.eventCode}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedEvent && (
              <a
                href={`/projector?eventCode=${encodeURIComponent(selectedEvent.eventCode)}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center px-3 font-display text-xs uppercase tracking-[0.15em] text-text-muted transition-colors hover:text-gold"
              >
                Projector
              </a>
            )}
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

        {activeTab === "before" && (
          <div className="space-y-3">
            <EventManager
              events={events}
              selected={selectedEvent}
              teamCount={teams.length}
              busy={busy}
              onSelect={setSelectedEventCode}
              onCreate={(name, eventCode) =>
                void post("/api/admin/events", { name, eventCode }, "Event created").then(
                  refreshAll
                )
              }
              onDuplicate={(sourceEventId, name, eventCode) =>
                void post(
                  "/api/admin/events/duplicate",
                  { sourceEventId, name, eventCode },
                  "Event duplicated"
                ).then(refreshAll)
              }
              onUpdate={(id, changes) =>
                void post("/api/admin/events", { id, ...changes }, "Event updated").then(
                  refreshAll
                )
              }
              onDelete={(event) =>
                setConfirming({
                  title: `Delete ${event.name}`,
                  scopeLine: `Deletes the event ${event.eventCode} and every team, session and AI log under it. Other events are untouched.`,
                  phrase: event.eventCode,
                  confirmLabel: "Delete the event",
                  run: async () => {
                    await authedFetch(
                      `/api/admin/events?id=${event.id}&confirm=${encodeURIComponent(event.eventCode)}`,
                      { method: "DELETE" }
                    );
                    announce("Event deleted");
                    await refreshAll();
                  },
                })
              }
            />

            {selectedEvent && (
              <SettingsTab
                form={settingsForm}
                onChange={setSettingsForm}
                saving={busy}
                onSave={() => {
                  const { maxAttempts, currentMysteryLimit, ...scoringSettings } =
                    settingsForm;
                  void post(
                    "/api/admin/events",
                    {
                      id: selectedEvent.id,
                      scoringSettings,
                      maxAttempts,
                      currentMysteryLimit,
                    },
                    "Settings saved"
                  ).then(loadEvents);
                }}
              />
            )}
          </div>
        )}

        {activeTab === "during" && (
          <div className="space-y-3">
            <AiHealthStrip
              health={aiHealth}
              busy={busy}
              onRecheck={() => void loadAiHealth(true)}
            />
            <LiveMonitor
              teams={monitor}
              loading={!loaded.monitor}
              counts={counts}
              onRescue={setRescuing}
            />
          </div>
        )}

        {activeTab === "after" && (
          <div className="space-y-3">
            <LeaderboardTab
              entries={leaderboard}
              loading={busy}
              onRefresh={() => void loadLeaderboard()}
              onExport={() => {
                window.open(
                  `/api/admin/leaderboard?eventCode=${encodeURIComponent(selectedEventCode)}&format=csv`,
                  "_blank"
                );
              }}
            />

            <TeamsTab
              teams={teams}
              loading={busy}
              onRefresh={() => void loadTeams()}
              onResetMystery={(teamId, mysteryId) =>
                void post(
                  "/api/admin/teams/reset",
                  { teamId, mysteryId },
                  `Reset ${MYSTERY_NAMES[mysteryId] || mysteryId}`
                ).then(refreshAll)
              }
              onResetAll={(teamId) => {
                const team = teams.find((t) => t.id === teamId);
                if (!team) return;
                setConfirming({
                  title: `Reset ${team.name}`,
                  scopeLine: `Clears every case for ${team.name}, including their notes and case board. The team keeps its name and PIN.`,
                  phrase: team.name,
                  confirmLabel: "Reset the team",
                  run: async () => {
                    await authedFetch("/api/admin/teams/reset-all", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ teamId }),
                    });
                    announce("Team reset");
                    await refreshAll();
                  },
                });
              }}
              onResetPin={(teamId, newPin) =>
                void post(
                  "/api/admin/teams/reset-pin",
                  { teamId, newPin },
                  "PIN updated"
                ).then(loadTeams)
              }
              onDeleteTeam={(teamId, name) =>
                setConfirming({
                  title: `Delete ${name}`,
                  scopeLine: `Removes ${name} and everything they have done in this event.`,
                  phrase: name,
                  confirmLabel: "Delete the team",
                  run: async () => {
                    await authedFetch("/api/admin/delete-team", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ teamId }),
                    });
                    announce(`Deleted ${name}`);
                    await refreshAll();
                  },
                })
              }
            />

            <AiLogsTab
              logs={aiLogs}
              teams={teams}
              filter={aiFilter}
              onFilterChange={setAiFilter}
              onRefresh={() => void loadAiLogs()}
              loading={busy}
            />

            {selectedEvent && (
              <Card tone="error" title="Reset this event">
                <p className="mb-3 text-sm text-text-secondary">
                  Both options are scoped to{" "}
                  <strong className="text-text-primary">
                    {selectedEvent.eventCode}
                  </strong>
                  . No other event is touched.
                </p>
                <div className="flex flex-col gap-2">
                  {MYSTERY_IDS.map((mysteryId) => (
                    <Button
                      key={mysteryId}
                      variant="secondary"
                      fullWidth
                      onClick={() =>
                        void post(
                          "/api/admin/reset",
                          { mysteryId, eventId: selectedEvent.id },
                          `Reset ${MYSTERY_NAMES[mysteryId]} for every team`
                        ).then(refreshAll)
                      }
                    >
                      Reset {MYSTERY_NAMES[mysteryId]} for everyone
                    </Button>
                  ))}

                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() =>
                      setConfirming({
                        title: "Clear progress",
                        scopeLine: `Deletes every session and AI log in ${selectedEvent.eventCode}, so all teams start again from case one. The teams and their PINs are kept, so nobody has to re-register.`,
                        phrase: selectedEvent.eventCode,
                        confirmLabel: "Clear progress",
                        run: async () => {
                          await authedFetch("/api/admin/events/reset", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              eventId: selectedEvent.id,
                              scope: "sessions",
                              confirm: selectedEvent.eventCode,
                            }),
                          });
                          announce("Progress cleared");
                          await refreshAll();
                        },
                      })
                    }
                  >
                    Clear all progress, keep the teams
                  </Button>

                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() =>
                      setConfirming({
                        title: "Wipe the event",
                        scopeLine: `Deletes every team, session and AI log in ${selectedEvent.eventCode}. Everyone will have to register again. The event itself and its settings survive.`,
                        phrase: selectedEvent.eventCode,
                        confirmLabel: "Wipe the event",
                        run: async () => {
                          await authedFetch("/api/admin/events/reset", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              eventId: selectedEvent.id,
                              scope: "everything",
                              confirm: selectedEvent.eventCode,
                            }),
                          });
                          announce("Event wiped");
                          await refreshAll();
                        },
                      })
                    }
                  >
                    Wipe teams and progress
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "cases" && (
          <CaseFilesTab cases={caseFiles} loading={!loaded.cases} />
        )}
      </div>

      {rescuing && (
        <TeamRescue
          team={rescuing}
          busy={busy}
          onClose={() => setRescuing(null)}
          onAdjust={(changes) =>
            void post(
              "/api/admin/sessions/adjust",
              {
                teamId: rescuing.teamId,
                mysteryId: rescuing.current?.mysteryId,
                ...changes,
              },
              "Team helped"
            ).then(async () => {
              await refreshAll();
              setRescuing(null);
            })
          }
          onResetCase={(mysteryId) =>
            void post(
              "/api/admin/teams/reset",
              { teamId: rescuing.teamId, mysteryId },
              "Case reset"
            ).then(async () => {
              await refreshAll();
              setRescuing(null);
            })
          }
          onResetTeam={() =>
            setConfirming({
              title: `Reset ${rescuing.teamName}`,
              scopeLine: `Clears every case for ${rescuing.teamName}, including their notes and case board.`,
              phrase: rescuing.teamName,
              confirmLabel: "Reset the team",
              run: async () => {
                await authedFetch("/api/admin/teams/reset-all", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ teamId: rescuing.teamId }),
                });
                announce("Team reset");
                setRescuing(null);
                await refreshAll();
              },
            })
          }
          onDelete={() =>
            setConfirming({
              title: `Delete ${rescuing.teamName}`,
              scopeLine: `Removes ${rescuing.teamName} and everything they have done.`,
              phrase: rescuing.teamName,
              confirmLabel: "Delete the team",
              run: async () => {
                await authedFetch("/api/admin/delete-team", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ teamId: rescuing.teamId }),
                });
                announce("Team deleted");
                setRescuing(null);
                await refreshAll();
              },
            })
          }
        />
      )}

      {confirming && (
        <ConfirmAction
          title={confirming.title}
          scopeLine={confirming.scopeLine}
          detail={confirming.detail}
          phrase={confirming.phrase}
          confirmLabel={confirming.confirmLabel}
          busy={busy}
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            setBusy(true);
            await run(confirming.run, { errorMessage: "That did not work" });
            setBusy(false);
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}
