"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const DEFAULT_EVENT_ID = "d431c5d2-a078-42fe-addc-4483145692d1";

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<
    { id: string; name: string; eventId: string; createdAt: string }[]
  >([]);
  const [activeTab, setActiveTab] = useState<
    "teams" | "controls" | "leaderboard"
  >("teams");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getHeaders(extra: Record<string, string> = {}) {
    const h: Record<string, string> = { ...extra };
    if (authenticated) h["x-admin-passcode"] = passcode;
    return h;
  }

  useEffect(() => {
    if (authenticated) {
      loadTeams();
    }
  }, [authenticated]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passcode === "ATRIA") {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Invalid passcode");
    }
  }

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/teams?eventId=${DEFAULT_EVENT_ID}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(data.error || "Failed to load teams");
        if (res.status === 401) setAuthenticated(false);
        return;
      }
      setTeams(data.teams || []);
    } catch {
      setStatusMessage("Failed to load teams from database");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleResetMystery(mysteryId: string) {
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ mysteryId, eventId: DEFAULT_EVENT_ID }),
      });
      const data = await res.json();
      if (res.status === 401) { setAuthenticated(false); return; }
      setStatusMessage(data.error || `Progress for "${mysteryId}" has been reset.`);
    } catch {
      setStatusMessage("Failed to reset mystery.");
    }
    setTimeout(() => setStatusMessage(""), 3000);
  }

  async function handleClearAllData() {
    if (!confirm("This will delete all data and Supabase sessions. Are you sure?")) return;
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.status === 401) { setAuthenticated(false); return; }
      if (data.error) { setStatusMessage(data.error); return; }
      localStorage.clear();
      setTeams([]);
      setStatusMessage("All data cleared.");
    } catch {
      setStatusMessage("Failed to clear data.");
    }
    setTimeout(() => setStatusMessage(""), 3000);
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
            {error && (
              <p className="text-center text-xs text-error">{error}</p>
            )}
            <Button type="submit" fullWidth>
              Enter
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-bold uppercase tracking-wider text-accent">
            Admin Dashboard
          </h1>
          <a
            href="/"
            className="text-xs uppercase tracking-wider text-text-muted hover:text-gold transition-colors"
          >
            Home
          </a>
        </div>

        <div className="mb-4 flex gap-1 rounded border border-border-dark p-1">
          {(["teams", "controls", "leaderboard"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded py-1.5 text-[10px] uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {statusMessage && (
          <Card className="mb-4 border-gold/30 bg-gold/5">
            <p className="text-xs text-gold">{statusMessage}</p>
          </Card>
        )}

        {activeTab === "teams" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Registered Teams ({teams.length})
              </p>
              <Button size="sm" variant="ghost" onClick={loadTeams}>
                Refresh
              </Button>
            </div>

            {teams.length === 0 ? (
              <Card className="p-4 text-center">
                <p className="text-xs text-text-muted">
                  No teams registered yet.
                </p>
              </Card>
            ) : (
              teams.map((team) => (
                <Card key={team.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {team.name}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        ID: {team.id?.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-text-muted">
                        {new Date(team.createdAt).toLocaleDateString()}
                      </p>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete team "${team.name}" and all their data?`)) return;
                          try {
                            const res = await fetch("/api/admin/delete-team", {
                              method: "POST",
                              headers: getHeaders({ "Content-Type": "application/json" }),
                              body: JSON.stringify({ teamId: team.id }),
                            });
                            if (res.status === 401) { setAuthenticated(false); return; }
                            setTeams((prev) => prev.filter((t) => t.id !== team.id));
                            setStatusMessage(`Team "${team.name}" deleted.`);
                            setTimeout(() => setStatusMessage(""), 3000);
                          } catch {
                            setStatusMessage("Failed to delete team.");
                            setTimeout(() => setStatusMessage(""), 3000);
                          }
                        }}
                        className="text-xs text-error hover:text-accent-light transition-colors"
                        title="Delete team"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "controls" && (
          <div className="space-y-3">
            <Card>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gold">
                Reset Mystery Progress
              </h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => handleResetMystery("gilded-rose-mansion")}
                >
                  Reset: The Gilded Rose Mansion
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => handleResetMystery("hollowbrook-asylum")}
                >
                  Reset: The Hollowbrook Asylum
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => handleResetMystery("veil-of-ebonmere")}
                >
                  Reset: The Veil of Ebonmere
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-error">
                Danger Zone
              </h3>
              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={handleClearAllData}
              >
                Clear All Data
              </Button>
            </Card>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <Card className="p-4 text-center">
            <p className="text-sm text-text-muted">
              Leaderboard data is fetched live from the database.
              Teams are ranked by total score across all completed cases.
            </p>
          </Card>
        )}

        <div className="mt-8 border-t border-border-dark pt-4">
          <p className="text-center text-[10px] text-text-muted">
            Admin Dashboard v3.0.0 &mdash; Supabase Connected
          </p>
        </div>
      </div>
    </div>
  );
}
