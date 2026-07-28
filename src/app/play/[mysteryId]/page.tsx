"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getMysteryById } from "@/data/mystery-index";
import type { Mystery } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/error-boundary";
import { SolveCase } from "@/components/game/solve-case";
import { HintPanel } from "@/components/game/hint-panel";
import { DetectiveChat } from "@/components/game/detective-chat";
import { useGameSession } from "@/lib/game/use-game-session";
import {
  saveNotes,
  getNotes,
  toggleImportantEvidence,
  getImportantEvidence,
  isMysteryCompleted,
  getTeam,
} from "@/lib/storage/local";

type TabId = "introduction" | "story" | "suspects" | "evidence" | "timeline" | "solve";

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const mysteryId = params.mysteryId as string;

  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("introduction");
  const [showSolve, setShowSolve] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showDetective, setShowDetective] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [notes, setNotesState] = useState<Record<string, string>>({});
  const [importantEvidence, setImportantEvidence] = useState<string[]>([]);
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState<{
    score: number;
    nextMysteryId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const session = useGameSession(mystery);
  const teamId = typeof window !== "undefined" ? getTeam()?.id : null;
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingSyncRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    const m = getMysteryById(mysteryId);
    setMystery(m || null);

    if (m) {
      setNotesState(getNotes(m.id));
      setImportantEvidence(getImportantEvidence(m.id));
      setCompleted(isMysteryCompleted(m.id));
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [mysteryId]);

  useEffect(() => {
    if (!mystery || !teamId) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    fetch(`/api/sessions/resume?teamId=${teamId}&mysteryId=${mystery.id}`, {
      signal: abortRef.current.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.session?.state) {
          const s = data.session.state as Record<string, unknown>;
          if (s.notes) setNotesState(s.notes as Record<string, string>);
          if (s.importantEvidence) setImportantEvidence(s.importantEvidence as string[]);
          if (typeof s.wrongAttempts === "number") session.setWrongAttempts(s.wrongAttempts);
          if (typeof s.hintsUsed === "number") session.setHintsUsed(s.hintsUsed);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          // silently ignore failed resume
        }
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [mystery?.id, teamId]);

  useEffect(() => {
    if (!mystery || !teamId) return;
    if (syncRef.current) clearTimeout(syncRef.current);
    const stateData = {
      teamId,
      mysteryId: mystery.id,
      state: {
        notes,
        importantEvidence,
        wrongAttempts: session.wrongAttempts,
        hintsUsed: session.hintsUsed,
      },
    };
    pendingSyncRef.current = stateData;
    syncRef.current = setTimeout(() => {
      fetch("/api/sessions/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stateData),
      }).catch(() => {});
      pendingSyncRef.current = null;
    }, 2000);

    return () => {
      if (syncRef.current) clearTimeout(syncRef.current);
    };
  }, [notes, importantEvidence, session.wrongAttempts, session.hintsUsed, mystery?.id, teamId]);

  useEffect(() => {
    return () => {
      if (pendingSyncRef.current) {
        fetch("/api/sessions/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingSyncRef.current),
        }).catch(() => {});
        pendingSyncRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (completed && mystery && completionResult) {
      if (completionResult.nextMysteryId) {
        router.push(`/play/${completionResult.nextMysteryId}`);
      } else {
        router.push(
          `/win?mysteryId=${mystery.id}&score=${completionResult.score}&time=${session.elapsedSeconds}`
        );
      }
    }
  }, [completed, mystery, completionResult, session.elapsedSeconds, router]);

  const handleComplete = useCallback(
    (score: number, nextMysteryId: string | null) => {
      setCompletionResult({ score, nextMysteryId });
      setCompleted(true);
      setShowSolve(false);
    },
    []
  );

  const handleFail = useCallback(() => {
    setShowSolve(false);
    router.push(`/lost?mysteryId=${mysteryId}`);
  }, [mysteryId, router]);

  const handleHintUsed = useCallback(() => {
    setHintLevel((prev) => prev + 1);
    session.recordHint();
  }, [session.recordHint]);

  const handleNoteChange = useCallback(
    (suspectId: string, text: string) => {
      if (!mystery) return;
      saveNotes(mystery.id, suspectId, text);
      setNotesState((prev) => ({ ...prev, [suspectId]: text }));
    },
    [mystery]
  );

  const handleToggleEvidence = useCallback(
    (evidenceId: string) => {
      if (!mystery) return;
      const isImportant = toggleImportantEvidence(mystery.id, evidenceId);
      setImportantEvidence((prev) =>
        isImportant
          ? [...prev, evidenceId]
          : prev.filter((id) => id !== evidenceId)
      );
    },
    [mystery]
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-text-muted animate-pulse">Loading case file...</p>
      </div>
    );
  }

  if (!mystery) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-text-muted">Mystery not found</p>
      </div>
    );
  }

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "introduction", label: "Case" },
    { id: "story", label: "Story" },
    { id: "suspects", label: "Suspects" },
    { id: "evidence", label: "Evidence" },
    { id: "timeline", label: "Timeline" },
    { id: "solve", label: "Solve" },
  ];

  const evidenceCategories = [
    { value: "all", label: "All" },
    { value: "physical", label: "Physical" },
    { value: "statement", label: "Statements" },
    { value: "document", label: "Documents" },
    { value: "timeline", label: "Timeline" },
    { value: "digital", label: "Digital" },
  ];

  return (
    <ErrorBoundary>
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border-dark bg-dark-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xs font-bold uppercase tracking-wider text-accent">
              Case #{mystery.order}
            </h1>
            <p className="truncate text-[10px] text-text-muted">
              {mystery.title}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="tabular-nums">{formatTimer(session.elapsedSeconds)}</span>
            <span className="text-text-muted">|</span>
            <span>Attempts: {session.wrongAttempts}/10</span>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded px-3 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? "bg-accent text-white"
                  : "bg-dark-700 text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="game-content flex-1 overflow-y-auto p-3 pb-24">
        {activeTab === "introduction" && (
          <div className="space-y-3">
            <Card>
              <p className="text-sm leading-relaxed text-text-secondary">
                {mystery.introduction}
              </p>
            </Card>
            <Card>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">
                The Victim
              </h3>
              <p className="text-sm font-bold text-text-primary">
                {mystery.victim.name}
              </p>
              <p className="text-xs text-text-muted">{mystery.victim.role}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {mystery.victim.description}
              </p>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => setActiveTab("story")}
              >
                Read the Story
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setActiveTab("suspects")}
              >
                View Suspects
              </Button>
            </div>
          </div>
        )}

        {activeTab === "story" && (
          <div className="space-y-3">
            {mystery.storySections.map((section) => (
              <Card key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gold">
                    {section.title}
                  </h3>
                  <span className="text-text-muted text-sm">
                    {expandedSections[section.id] ? "\u25B2" : "\u25BC"}
                  </span>
                </button>
                {!!expandedSections[section.id] && (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {section.content}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}

        {activeTab === "suspects" && (
          <div className="space-y-3">
            {mystery.suspects.map((suspect) => (
              <Card key={suspect.id}>
                <button
                  onClick={() =>
                    setExpandedSuspect(
                      expandedSuspect === suspect.id ? null : suspect.id
                    )
                  }
                  className="flex w-full items-start justify-between"
                >
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-text-primary">
                      {suspect.name}
                    </h3>
                    <p className="text-xs text-text-muted">{suspect.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-dark-600 px-2 py-0.5 text-[10px] text-text-muted">
                      {suspect.relationshipToVictim}
                    </span>
                    <span className="text-text-muted text-sm">
                      {expandedSuspect === suspect.id ? "\u25B2" : "\u25BC"}
                    </span>
                  </div>
                </button>

                {expandedSuspect === suspect.id && (
                  <div className="mt-3 space-y-3 text-sm text-text-secondary">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                        Statement
                      </p>
                      <p className="italic border-l-2 border-accent/30 pl-3">
                        &ldquo;{suspect.statement}&rdquo;
                      </p>
                    </div>
                    {suspect.alibi && (
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                          Alibi
                        </p>
                        <p className="border-l-2 border-gold/30 pl-3">
                          {suspect.alibi}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                        Points of Interest
                      </p>
                      <ul className="list-inside list-disc space-y-0.5">
                        {suspect.suspiciousDetails.map((detail, i) => (
                          <li key={`${suspect.id}-detail-${i}`} className="text-xs">
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                        Detective Notes
                      </p>
                      <textarea
                        value={notes[suspect.id] || ""}
                        onChange={(e) =>
                          handleNoteChange(suspect.id, e.target.value)
                        }
                        placeholder="Add your observations..."
                        className="w-full rounded border border-border-dark bg-dark-700 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 min-h-[50px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="space-y-3">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {evidenceCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setEvidenceFilter(cat.value)}
                  className={`shrink-0 rounded px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                    evidenceFilter === cat.value
                      ? "bg-accent text-white"
                      : "bg-dark-700 text-text-muted hover:text-text-primary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {mystery.evidence
              .filter(
                (item) =>
                  evidenceFilter === "all" || item.category === evidenceFilter
              )
              .map((item) => {
                const isImportant = importantEvidence.includes(item.id);
                const relatedSuspects = item.relatedSuspectIds
                  .map((id) => mystery.suspects.find((s) => s.id === id))
                  .filter(Boolean);

                return (
                  <Card
                    key={item.id}
                    className={
                      isImportant ? "border-accent/40" : "border-border-dark"
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-text-primary">
                            {item.title}
                          </h3>
                          <span className="rounded bg-dark-600 px-1.5 py-0.5 text-[10px] text-text-muted uppercase">
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleEvidence(item.id)}
                        className={`ml-2 text-sm ${
                          isImportant
                            ? "text-accent"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                        title={
                          isImportant
                            ? "Remove from important"
                            : "Mark as important"
                        }
                      >
                        {isImportant ? "\u2605" : "\u2606"}
                      </button>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {item.description}
                    </p>
                    {relatedSuspects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {relatedSuspects.map((s) => s && (
                          <span
                            key={s.id}
                            className="rounded bg-dark-600 px-2 py-0.5 text-[10px] text-text-muted"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        )}

        {activeTab === "timeline" && mystery.timeline && (
          <div className="space-y-2">
            {mystery.timeline.map((event, i) => (
              <div key={`timeline-${event.time}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      event.relatedSuspectId ? "bg-accent" : "bg-dark-500"
                    }`}
                  />
                  {i < (mystery.timeline?.length || 0) - 1 && (
                    <div className="h-full w-px bg-border-dark" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-bold text-gold">{event.time}</p>
                  <p className="text-sm text-text-secondary">{event.event}</p>
                  {event.relatedSuspectId && (
                    <p className="text-[10px] text-accent">
                      Related:{" "}
                      {mystery.suspects.find(
                        (s) => s.id === event.relatedSuspectId
                      )?.name || "Unknown"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "solve" && (
          <div className="space-y-4">
            <Card className="border-accent/30">
              <div className="text-center">
                <div className="mb-2 text-2xl">\uD83D\uDD0D</div>
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-accent">
                  Ready to Solve the Case?
                </h3>
                <p className="mb-4 text-xs text-text-muted">
                  Identify the murderer and their motive to complete this case
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button fullWidth onClick={() => setShowSolve(true)}>
                  Submit Your Answer
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setShowDetective(true);
                  }}
                >
                  Ask the Detective
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setShowHint(true);
                  }}
                >
                  Request a Hint
                </Button>
              </div>
            </Card>

            <Card className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Case Progress
              </p>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs">
                <div>
                  <span className="text-text-muted">Attempts: </span>
                  <span className="text-text-primary">
                    {session.wrongAttempts}/10
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">Time: </span>
                  <span className="text-text-primary">
                    {formatTimer(session.elapsedSeconds)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {showSolve && mystery && (
        <SolveCase
          mystery={mystery}
          elapsedSeconds={session.elapsedSeconds}
          wrongAttempts={session.wrongAttempts}
          hintsUsed={session.hintsUsed}
          onComplete={handleComplete}
          onFail={handleFail}
          onWrongAttempt={session.recordWrongAttempt}
          onClose={() => setShowSolve(false)}
        />
      )}

      {showHint && mystery && (
        <HintPanel
          mystery={mystery}
          currentLevel={hintLevel}
          onHintUsed={handleHintUsed}
          onClose={() => setShowHint(false)}
        />
      )}

      {showDetective && mystery && (
        <DetectiveChat
          mystery={mystery}
          onClose={() => setShowDetective(false)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
