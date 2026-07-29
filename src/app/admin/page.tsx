"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type TabId = "dashboard" | "teams" | "settings" | "ai-logs" | "leaderboard";

interface SessionInfo {
  mysteryId: string;
  status: string;
  wrongAttempts: number;
  hintsUsed: number;
  score: number;
  elapsedSeconds: number;
  startedAt: string;
  completedAt: string;
  lastSavedAt: string;
}

interface TeamWithSessions {
  id: string;
  name: string;
  pin: string;
  eventId: string;
  createdAt: string;
  lastActiveAt: string;
  sessions: SessionInfo[];
}

interface EventInfo {
  id: string;
  name: string;
  eventCode: string;
  status: string;
  createdAt: string;
  scoringSettings: Record<string, number>;
  currentMysteryLimit: number;
  maxAttempts: number;
}

interface AiLog {
  id: string;
  session_id: string;
  type: string;
  player_input: string;
  ai_output: string;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  totalScore: number;
  mysteriesCompleted: number;
  totalTime: number;
  hintsUsed: number;
  wrongAttempts: number;
}

const MYSTERY_NAMES: Record<string, string> = {
  "gilded-rose-mansion": "Gilded Rose Mansion",
  "hollowbrook-asylum": "Hollowbrook Asylum",
  "veil-of-ebonmere": "Veil of Ebonmere",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-dark-500 text-text-muted",
  open: "bg-success text-white",
  paused: "bg-warning text-white",
  closed: "bg-error text-white",
};

const AI_TYPES: Record<string, string> = {
  murderer_validation: "Murderer",
  motive_validation: "Motive",
  hint: "Hint",
  detective_chat: "Chat",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState("");
  const [teams, setTeams] = useState<TeamWithSessions[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [aiFilter, setAiFilter] = useState({ teamId: "", type: "" });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const selectedEvent = events.find((e) => e.eventCode === selectedEventCode);

  const [settingsForm, setSettingsForm] = useState({
    baseScore: 1000,
    wrongAttemptPenalty: 150,
    hintPenalty: 100,
    timePenaltyPerMinute: 10,
    speedBonusThresholdMinutes: 30,
    speedBonus: 50,
    minimumScore: 100,
    maxAttempts: 10,
    currentMysteryLimit: 3,
  });

  useEffect(() => {
    setSelectedEventCode(process.env.NEXT_PUBLIC_DEFAULT_EVENT_CODE || "");
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid passcode");
      }
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
        if (data.events.length > 0 && !data.events.find((e: EventInfo) => e.eventCode === selectedEventCode)) {
          setSelectedEventCode(data.events[0].eventCode);
        }
      }
    } catch { /* silent */ }
  }, [selectedEventCode]);

  const loadTeams = useCallback(async () => {
    if (!selectedEventCode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/teams?eventCode=${encodeURIComponent(selectedEventCode)}`);
      const data = await res.json();
      if (res.status === 401) { setAuthenticated(false); return; }
      setTeams(data.teams || []);
    } catch {
      setStatusMessage("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [selectedEventCode]);

  const loadAiLogs = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (aiFilter.teamId) params.set("teamId", aiFilter.teamId);
    if (aiFilter.type) params.set("type", aiFilter.type);
    try {
      const res = await fetch(`/api/admin/ai-interactions?${params}`);
      const data = await res.json();
      if (res.status === 401) { setAuthenticated(false); return; }
      setAiLogs(data.interactions || []);
    } catch { /* silent */ }
  }, [aiFilter]);

  const loadLeaderboard = useCallback(async () => {
    if (!selectedEventCode) return;
    try {
      const res = await fetch(`/api/admin/leaderboard?eventCode=${encodeURIComponent(selectedEventCode)}`);
      const data = await res.json();
      if (res.status === 401) { setAuthenticated(false); return; }
      setLeaderboard(data.leaderboard || []);
    } catch { /* silent */ }
  }, [selectedEventCode]);

  useEffect(() => {
    if (authenticated) {
      loadEvents();
    }
  }, [authenticated, loadEvents]);

  useEffect(() => {
    if (authenticated && selectedEventCode) {
      loadTeams();
      loadLeaderboard();
    }
  }, [authenticated, selectedEventCode, loadTeams, loadLeaderboard]);

  useEffect(() => {
    if (authenticated && selectedEvent) {
      setSettingsForm({
        baseScore: selectedEvent.scoringSettings?.baseScore || 1000,
        wrongAttemptPenalty: selectedEvent.scoringSettings?.wrongAttemptPenalty || 150,
        hintPenalty: selectedEvent.scoringSettings?.hintPenalty || 100,
        timePenaltyPerMinute: selectedEvent.scoringSettings?.timePenaltyPerMinute || 10,
        speedBonusThresholdMinutes: selectedEvent.scoringSettings?.speedBonusThresholdMinutes || 30,
        speedBonus: selectedEvent.scoringSettings?.speedBonus || 50,
        minimumScore: selectedEvent.scoringSettings?.minimumScore || 100,
        maxAttempts: selectedEvent.maxAttempts || 10,
        currentMysteryLimit: selectedEvent.currentMysteryLimit || 3,
      });
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (authenticated && activeTab === "ai-logs") loadAiLogs();
  }, [authenticated, activeTab, loadAiLogs]);

  async function handleEventAction(action: string) {
    if (!selectedEventCode) return;
    const statusMap: Record<string, string> = {
      openRegistrations: "open",
      start: "open",
      pause: "paused",
      close: "closed",
    };
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventCode: selectedEventCode, status: statusMap[action] || action }),
      });
      if (res.status === 401) { setAuthenticated(false); return; }
      const data = await res.json();
      if (data.event) {
        setEvents((prev) => prev.map((e) => (e.eventCode === selectedEventCode ? data.event : e)));
        setStatusMessage(`Event status updated to ${STATUS_LABELS[data.event.status]}`);
      }
    } catch {
      setStatusMessage("Failed to update event");
    }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleSaveSettings() {
    if (!selectedEventCode) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCode: selectedEventCode,
          scoringSettings: {
            baseScore: settingsForm.baseScore,
            wrongAttemptPenalty: settingsForm.wrongAttemptPenalty,
            hintPenalty: settingsForm.hintPenalty,
            timePenaltyPerMinute: settingsForm.timePenaltyPerMinute,
            speedBonusThresholdMinutes: settingsForm.speedBonusThresholdMinutes,
            speedBonus: settingsForm.speedBonus,
            minimumScore: settingsForm.minimumScore,
          },
          maxAttempts: settingsForm.maxAttempts,
          currentMysteryLimit: settingsForm.currentMysteryLimit,
        }),
      });
      if (res.status === 401) { setAuthenticated(false); return; }
      const data = await res.json();
      if (data.event) {
        setEvents((prev) => prev.map((e) => (e.eventCode === selectedEventCode ? data.event : e)));
        setStatusMessage("Settings saved");
      }
    } catch {
      setStatusMessage("Failed to save settings");
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(""), 3000);
    }
  }

  async function handleResetTeamMystery(teamId: string, mysteryId: string) {
    try {
      const res = await fetch("/api/admin/teams/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, mysteryId }),
      });
      if (res.status === 401) { setAuthenticated(false); return; }
      setStatusMessage(`Reset ${MYSTERY_NAMES[mysteryId] || mysteryId} for team`);
      loadTeams();
    } catch { setStatusMessage("Failed to reset"); }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleResetTeamAll(teamId: string) {
    if (!confirm("Reset ALL sessions for this team?")) return;
    try {
      const res = await fetch("/api/admin/teams/reset-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.status === 401) { setAuthenticated(false); return; }
      setStatusMessage("All sessions reset");
      loadTeams();
    } catch { setStatusMessage("Failed to reset"); }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleResetPin(teamId: string, newPin: string) {
    try {
      const res = await fetch("/api/admin/teams/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, newPin }),
      });
      if (res.status === 401) { setAuthenticated(false); return; }
      setStatusMessage("PIN updated");
      loadTeams();
    } catch { setStatusMessage("Failed to reset PIN"); }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleDeleteTeam(teamId: string, name: string) {
    if (!confirm(`Delete team "${name}" and all their data?`)) return;
    try {
      const res = await fetch("/api/admin/delete-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (res.status === 401) { setAuthenticated(false); return; }
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setStatusMessage(`Team "${name}" deleted`);
    } catch { setStatusMessage("Failed to delete"); }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleClearAllData() {
    if (!confirm("Delete ALL data (teams, sessions, AI logs)? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/clear", { method: "POST" });
      if (res.status === 401) { setAuthenticated(false); return; }
      const data = await res.json();
      if (data.error) { setStatusMessage(data.error); return; }
      setTeams([]);
      setAiLogs([]);
      setLeaderboard([]);
      setStatusMessage("All data cleared");
    } catch { setStatusMessage("Failed to clear data"); }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleExportCSV() {
    try {
      const res = await fetch(`/api/admin/leaderboard?eventCode=${encodeURIComponent(selectedEventCode)}&format=csv`);
      if (res.status === 401) { setAuthenticated(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leaderboard-${selectedEventCode}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setStatusMessage("Export failed"); }
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-xs">
          <h1 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-accent">
            Admin Access
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <Input
              label="Passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode"
            />
            {error && <p className="text-center text-xs text-error">{error}</p>}
            <Button type="submit" fullWidth loading={loading}>Enter</Button>
          </form>
        </Card>
      </div>
    );
  }

  const tabList: { id: TabId; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "teams", label: "Teams" },
    { id: "settings", label: "Settings" },
    { id: "ai-logs", label: "AI Logs" },
    { id: "leaderboard", label: "Leaderboard" },
  ];

  const activeSessions = teams.reduce((c, t) => c + t.sessions.filter((s) => s.status === "in_progress").length, 0);
  const completedSessions = teams.reduce((c, t) => c + t.sessions.filter((s) => s.status === "completed").length, 0);
  const failedSessions = teams.reduce((c, t) => c + t.sessions.filter((s) => s.status === "failed").length, 0);

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-lg font-bold uppercase tracking-wider text-accent">Admin</h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs uppercase text-text-muted hover:text-gold">Home</a>
            <button onClick={() => setAuthenticated(false)} className="text-xs uppercase text-error hover:text-accent-light">Logout</button>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Event</label>
          <select
            value={selectedEventCode}
            onChange={(e) => setSelectedEventCode(e.target.value)}
            className="w-full rounded border border-border-dark bg-dark-800 px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.eventCode}>
                {ev.name} ({ev.eventCode}) — {STATUS_LABELS[ev.status]}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div className="mb-4 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] uppercase font-bold ${STATUS_COLORS[selectedEvent.status] || "bg-dark-500 text-text-muted"}`}>
              {STATUS_LABELS[selectedEvent.status]}
            </span>
            <span className="text-xs text-text-muted">{selectedEvent.name}</span>
          </div>
        )}

        {statusMessage && (
          <Card className="mb-4 border-gold/30 bg-gold/5">
            <p className="text-xs text-gold">{statusMessage}</p>
          </Card>
        )}

        <div className="mb-4 flex gap-1 rounded border border-border-dark p-1 overflow-x-auto">
          {tabList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded px-3 py-1.5 text-[10px] uppercase tracking-wider ${
                activeTab === tab.id ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && selectedEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card className="text-center">
                <p className="text-[10px] uppercase text-text-muted">Teams</p>
                <p className="text-xl font-bold text-text-primary">{teams.length}</p>
              </Card>
              <Card className="text-center">
                <p className="text-[10px] uppercase text-text-muted">Active</p>
                <p className="text-xl font-bold text-gold">{activeSessions}</p>
              </Card>
              <Card className="text-center">
                <p className="text-[10px] uppercase text-text-muted">Completed</p>
                <p className="text-xl font-bold text-success">{completedSessions}</p>
              </Card>
              <Card className="text-center">
                <p className="text-[10px] uppercase text-text-muted">Failed</p>
                <p className="text-xl font-bold text-error">{failedSessions}</p>
              </Card>
            </div>

            <Card>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gold">Event Controls</h3>
              <div className="flex flex-wrap gap-2">
                {selectedEvent.status === "draft" && (
                  <Button size="sm" onClick={() => handleEventAction("open")}>Open Registrations</Button>
                )}
                {selectedEvent.status === "open" && (
                  <Button size="sm" onClick={() => handleEventAction("paused")}>Pause Event</Button>
                )}
                {selectedEvent.status === "paused" && (
                  <Button size="sm" onClick={() => handleEventAction("open")}>Resume Event</Button>
                )}
                {selectedEvent.status !== "closed" && (
                  <Button size="sm" variant="danger" onClick={() => handleEventAction("close")}>Close Event</Button>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary">Mystery Progress</h3>
              {["gilded-rose-mansion", "hollowbrook-asylum", "veil-of-ebonmere"].map((mid) => {
                const completedCount = teams.reduce(
                  (c, t) => c + t.sessions.filter((s) => s.mysteryId === mid && s.status === "completed").length, 0
                );
                const inProgressCount = teams.reduce(
                  (c, t) => c + t.sessions.filter((s) => s.mysteryId === mid && s.status === "in_progress").length, 0
                );
                return (
                  <div key={mid} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">{MYSTERY_NAMES[mid] || mid}</span>
                      <span className="text-text-muted">{completedCount} completed / {inProgressCount} active</span>
                    </div>
                    <div className="h-1.5 rounded bg-dark-600 overflow-hidden">
                      <div
                        className="h-full rounded bg-accent transition-all"
                        style={{ width: `${teams.length > 0 ? ((completedCount / teams.length) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Teams ({teams.length})
              </p>
              <Button size="sm" variant="ghost" onClick={loadTeams}>Refresh</Button>
            </div>
            {teams.length === 0 ? (
              <Card className="p-4 text-center">
                <p className="text-xs text-text-muted">No teams registered yet.</p>
              </Card>
            ) : (
              teams.map((team) => {
                const currentSession = team.sessions.find((s) => s.status === "in_progress") ||
                  team.sessions.find((s) => s.status === "completed") ||
                  team.sessions[0];
                const isExpanded = expandedTeam === team.id;
                return (
                  <Card key={team.id}>
                    <button
                      onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{team.name}</p>
                          <p className="text-[10px] text-text-muted">
                            {currentSession ? (
                              <>
                                {MYSTERY_NAMES[currentSession.mysteryId] || currentSession.mysteryId}
                                {" · "}
                                <span className={currentSession.status === "completed" ? "text-success" : currentSession.status === "failed" ? "text-error" : "text-gold"}>
                                  {currentSession.status}
                                </span>
                                {currentSession.score > 0 && <> · {currentSession.score} pts</>}
                              </>
                            ) : (
                              <>No sessions</>
                            )}
                          </p>
                          {team.lastActiveAt && (
                            <p className="text-[10px] text-text-muted">
                              Last: {new Date(team.lastActiveAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="rounded bg-dark-600 px-2 py-0.5 text-[10px] text-text-muted">
                            H:{currentSession?.hintsUsed || 0} W:{currentSession?.wrongAttempts || 0}
                          </span>
                          <span className="text-text-muted text-sm">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border-dark space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Sessions</p>
                        {team.sessions.map((s) => (
                          <div key={s.mysteryId} className="flex items-center justify-between bg-dark-800 rounded p-2 text-xs">
                            <div>
                              <span className="text-text-primary font-medium">
                                {MYSTERY_NAMES[s.mysteryId] || s.mysteryId}
                              </span>
                              <span className={`ml-2 ${s.status === "completed" ? "text-success" : s.status === "failed" ? "text-error" : s.status === "in_progress" ? "text-gold" : "text-text-muted"}`}>
                                {s.status}
                              </span>
                              {s.score > 0 && <span className="ml-1 text-gold">{s.score} pts</span>}
                              {s.elapsedSeconds > 0 && <span className="ml-1 text-text-muted">{formatTime(s.elapsedSeconds)}</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-text-muted">H:{s.hintsUsed} W:{s.wrongAttempts}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResetTeamMystery(team.id, s.mysteryId)}
                              >
                                Reset
                              </Button>
                            </div>
                          </div>
                        ))}
                        {team.sessions.length === 0 && (
                          <p className="text-xs text-text-muted">No sessions found</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder={team.pin}
                            label="New PIN"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleResetPin(team.id, (e.target as HTMLInputElement).value);
                              }
                            }}
                          />
                          <Button size="sm" variant="danger" onClick={() => handleResetTeamAll(team.id)}>
                            Reset All
                          </Button>
                          <button
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="text-xs text-error hover:text-accent-light px-2"
                            title="Delete team"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === "settings" && selectedEvent && (
          <div className="space-y-4">
            <Card>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">Scoring Configuration</h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["baseScore", "Base Score"],
                  ["wrongAttemptPenalty", "Wrong Attempt Penalty"],
                  ["hintPenalty", "Hint Penalty"],
                  ["timePenaltyPerMinute", "Time Penalty/min"],
                  ["speedBonusThresholdMinutes", "Speed Bonus Threshold (min)"],
                  ["speedBonus", "Speed Bonus"],
                  ["minimumScore", "Minimum Score"],
                ] as [string, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">{label}</label>
                    <input
                      type="number"
                      value={settingsForm[key as keyof typeof settingsForm]}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full rounded border border-border-dark bg-dark-800 px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Max Attempts</label>
                  <input
                    type="number"
                    value={settingsForm.maxAttempts}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, maxAttempts: parseInt(e.target.value) || 10 }))}
                    className="w-full rounded border border-border-dark bg-dark-800 px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">Mystery Limit</label>
                  <input
                    type="number"
                    value={settingsForm.currentMysteryLimit}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, currentMysteryLimit: parseInt(e.target.value) || 3 }))}
                    className="w-full rounded border border-border-dark bg-dark-800 px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button fullWidth onClick={handleSaveSettings} loading={loading}>Save Settings</Button>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-error">Danger Zone</h3>
              <Button variant="danger" size="sm" fullWidth onClick={handleClearAllData}>
                Clear All Data
              </Button>
            </Card>
          </div>
        )}

        {activeTab === "ai-logs" && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <select
                value={aiFilter.type}
                onChange={(e) => setAiFilter((prev) => ({ ...prev, type: e.target.value }))}
                className="rounded border border-border-dark bg-dark-800 px-2 py-1.5 text-xs text-text-primary"
              >
                <option value="">All types</option>
                <option value="murderer_validation">Murderer</option>
                <option value="motive_validation">Motive</option>
                <option value="hint">Hint</option>
                <option value="detective_chat">Chat</option>
              </select>
              <select
                value={aiFilter.teamId}
                onChange={(e) => setAiFilter((prev) => ({ ...prev, teamId: e.target.value }))}
                className="rounded border border-border-dark bg-dark-800 px-2 py-1.5 text-xs text-text-primary"
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={loadAiLogs}>Refresh</Button>
            </div>

            {aiLogs.length === 0 ? (
              <Card className="p-4 text-center">
                <p className="text-xs text-text-muted">No AI interactions found.</p>
              </Card>
            ) : (
              <div className="space-y-1">
                {aiLogs.map((log) => (
                  <div key={log.id} className="rounded border border-border-dark bg-dark-800">
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="rounded bg-dark-600 px-1.5 py-0.5 text-[10px] text-text-muted mr-2">
                          {AI_TYPES[log.type] || log.type}
                        </span>
                        <span className="text-text-secondary truncate">{log.player_input?.slice(0, 80) || "(empty)"}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-[10px] text-text-muted">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                        <span className="text-text-muted text-xs">{expandedLog === log.id ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedLog === log.id && (
                      <div className="px-3 pb-3 pt-1 border-t border-border-dark space-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Input</p>
                          <p className="text-xs text-text-secondary whitespace-pre-wrap">{log.player_input || "(empty)"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Output</p>
                          <p className="text-xs text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto">{log.ai_output || "(empty)"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Leaderboard ({leaderboard.length})
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={loadLeaderboard}>Refresh</Button>
                {leaderboard.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={handleExportCSV}>CSV</Button>
                )}
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <Card className="p-4 text-center">
                <p className="text-xs text-text-muted">No scores yet.</p>
              </Card>
            ) : (
              leaderboard.map((entry) => (
                <Card key={entry.teamName + entry.rank} className={entry.rank <= 3 ? "border-gold/30" : "border-border-dark"}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-700 text-xs font-bold text-text-secondary">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{entry.teamName}</p>
                      <p className="text-[10px] text-text-muted">
                        {entry.mysteriesCompleted} case{entry.mysteriesCompleted !== 1 ? "s" : ""} completed · {formatTime(entry.totalTime)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gold">{entry.totalScore}</p>
                      <p className="text-[10px] text-text-muted">{entry.hintsUsed} hints · {entry.wrongAttempts} wrong</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
