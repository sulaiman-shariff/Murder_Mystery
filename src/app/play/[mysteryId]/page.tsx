"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getMysteryById } from "@/data/mystery-index";
import type { BoardPin, Mystery, ScoringSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { ErrorBoundary } from "@/components/error-boundary";
import { SolveCase, type SolveResult } from "@/components/game/solve-case";
import { AlibiSheet, InterrogateSheet } from "@/components/game/suspect-sheets";
import { BoardPanel } from "./components/board-panel";
import { HintPanel } from "@/components/game/hint-panel";
import { DetectiveChat } from "@/components/game/detective-chat";
import { useGameSession } from "@/lib/game/use-game-session";
import { storeLastResult } from "@/lib/game/last-result";
import { useSharedState } from "@/lib/game/use-shared-state";
import { CaseHeader } from "./components/case-header";
import {
  IntroPanel,
  StoryPanel,
  SuspectsPanel,
  EvidencePanel,
  TimelinePanel,
} from "./components/tab-panels";
import {
  saveNotes,
  getNotes,
  toggleImportantEvidence,
  getImportantEvidence,
  isMysteryCompleted,
  getTeam,
} from "@/lib/storage/local";

type TabId =
  | "introduction"
  | "story"
  | "suspects"
  | "evidence"
  | "timeline"
  | "board"
  | "solve";

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const mysteryId = params.mysteryId as string;

  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("introduction");
  const [showSolve, setShowSolve] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showDetective, setShowDetective] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(10);
  const [scoring, setScoring] = useState<ScoringSettings | undefined>();
  const [maxSelections, setMaxSelections] = useState(5);
  const [alibiFor, setAlibiFor] = useState<string | null>(null);
  const [confrontFor, setConfrontFor] = useState<string | null>(null);

  const session = useGameSession(mystery);
  // One shared document for the whole team, merged across their devices.
  const shared = useSharedState(mysteryId, !!mystery && !completed);
  const {
    notes,
    importantEvidence,
    boardPins,
    alibisBroken,
    setNote,
    toggleEvidence,
    setPins,
  } = shared;
  const teamId = typeof window !== "undefined" ? getTeam()?.id : null;
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<Record<string, unknown> | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const found = getMysteryById(mysteryId);
    setMystery(found || null);
    if (!found) {
      setLoading(false);
      return;
    }

    setCompleted(isMysteryCompleted(found.id));

    if (!teamId) {
      setLoading(false);
      return;
    }

    fetch("/api/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        eventId: getTeam()?.eventId || "default",
        mysteryId: found.id,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.session) {
          if (typeof data.maxAttempts === "number") {
            setMaxAttempts(data.maxAttempts);
          }
          if (data.scoring) setScoring(data.scoring as ScoringSettings);
          if (typeof data.maxSelections === "number") {
            setMaxSelections(data.maxSelections);
          }
          shared.hydrate(data.session.state, data.session.stateRev ?? 0);
        }
      })
      .catch((err) => {
        console.error("Could not start session:", err);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mysteryId, teamId]);

  // A new tab should start at the top, not wherever the last one was scrolled.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  const handleComplete = useCallback(
    (result: SolveResult) => {
      if (!mystery) return;
      storeLastResult({
        mysteryId: mystery.id,
        score: result.score,
        elapsedSeconds: session.elapsedSeconds,
        breakdown: result.breakdown,
        bonuses: result.bonuses,
      });
      setShowSolve(false);
      setCompleted(true);
      router.push(
        `/win?mysteryId=${mystery.id}&score=${result.score}&time=${session.elapsedSeconds}` +
          (result.nextMysteryId
            ? `&nextMysteryId=${result.nextMysteryId}`
            : "")
      );
    },
    [mystery, router, session.elapsedSeconds]
  );

  const handleFail = useCallback(() => {
    setShowSolve(false);
    router.push(`/lost?mysteryId=${mysteryId}`);
  }, [mysteryId, router]);

  if (loading) {
    return <LoadingScreen label="Opening the case file" />;
  }

  if (!mystery) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <Stamp tone="muted">No such case</Stamp>
        <p className="mt-4 text-sm text-text-muted">
          That case is not in the archive.
        </p>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  const tabs: TabItem<TabId>[] = [
    { id: "introduction", label: "Case" },
    { id: "story", label: "Story" },
    { id: "suspects", label: "Suspects" },
    { id: "evidence", label: "Evidence" },
    { id: "timeline", label: "Timeline" },
    { id: "board", label: "Board" },
    ...(completed ? [] : [{ id: "solve" as TabId, label: "Accuse" }]),
  ];

  return (
    <ErrorBoundary>
      {/* h-dvh (not min-h-screen) makes <main> the real scroll container, so
          overscroll containment applies and the bottom bar never floats over
          dead space. */}
      <div className="flex h-dvh flex-col">
        <header className="safe-top z-10 shrink-0 border-b border-border-dark bg-ink-900">
          {/* Same measure as the content, so the timer and tabs sit with the
              case rather than stranded at the edges of a wide screen. */}
          <div className="mx-auto w-full max-w-5xl">
          <CaseHeader
            order={mystery.order}
            title={mystery.title}
            elapsedSeconds={session.elapsedSeconds}
            wrongAttempts={session.wrongAttempts}
            maxAttempts={maxAttempts}
            completed={completed}
          />
          <Tabs
            tabs={tabs}
            active={activeTab}
            onChange={(id) => setActiveTab(id)}
          />
          </div>
        </header>

        <main
          ref={mainRef}
          className="scroll-region min-h-0 flex-1 overflow-y-auto p-3"
        >
          <div className="mx-auto w-full max-w-5xl">
            {activeTab === "introduction" && (
              <IntroPanel
                mystery={mystery}
                onGoToStory={() => setActiveTab("story")}
                onGoToSuspects={() => setActiveTab("suspects")}
              />
            )}

            {activeTab === "story" && <StoryPanel mystery={mystery} />}

            {activeTab === "suspects" && (
              <SuspectsPanel
                mystery={mystery}
                notes={notes}
                onNoteChange={setNote}
                alibisBroken={alibisBroken}
                onChallengeAlibi={setAlibiFor}
                onConfront={setConfrontFor}
              />
            )}

            {activeTab === "evidence" && (
              <EvidencePanel
                mystery={mystery}
                importantEvidence={importantEvidence}
                onToggleEvidence={toggleEvidence}
              />
            )}

            {activeTab === "timeline" && <TimelinePanel mystery={mystery} />}

            {activeTab === "board" && (
              <BoardPanel
                mystery={mystery}
                pins={boardPins}
                onChange={setPins}
                alibisBroken={alibisBroken}
              />
            )}

            {activeTab === "solve" && !completed && (
              <div className="mx-auto max-w-2xl space-y-3">
                <Card tone="accent" title="Close the case">
                  <p className="text-[15px] leading-relaxed text-text-secondary">
                    Name the murderer, explain their motive, and pick out the
                    clues that prove it. All three have to hold up — a wrong
                    accusation costs you an attempt and points.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button fullWidth size="lg" onClick={() => setShowSolve(true)}>
                      Make your accusation
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => setShowDetective(true)}
                    >
                      Ask the detective
                    </Button>
                    <Button
                      variant="gold"
                      fullWidth
                      onClick={() => setShowHint(true)}
                    >
                      Request a hint
                    </Button>
                  </div>
                </Card>

                <Card title="Case progress">
                  <dl className="grid grid-cols-3 gap-3 text-center">
                    <Stat
                      label="Elapsed"
                      value={formatTimer(session.elapsedSeconds)}
                    />
                    <Stat
                      label="Attempts"
                      value={`${session.wrongAttempts}/${maxAttempts}`}
                    />
                    <Stat label="Hints" value={String(session.hintsUsed)} />
                  </dl>
                </Card>
              </div>
            )}

            {completed && activeTab === "introduction" && (
              <Card tone="gold" className="mt-3 text-center">
                <Stamp tone="gold">Case Closed</Stamp>
                <p className="mt-4 text-sm text-text-secondary">
                  You solved this one. The file stays open for review.
                </p>
                <Button
                  variant="ghost"
                  fullWidth
                  className="mt-3"
                  onClick={() => router.push("/leaderboard")}
                >
                  View leaderboard
                </Button>
              </Card>
            )}
          </div>
        </main>

        <div className="bar-pad-bottom z-10 shrink-0 border-t border-border-dark bg-ink-900 px-3 pt-2">
          <div className="mx-auto flex w-full max-w-5xl gap-2">
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={() => setShowDetective(true)}
            >
              Detective
            </Button>
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={() => setShowHint(true)}
            >
              Hint
            </Button>
            {!completed && (
              <Button size="sm" fullWidth onClick={() => setShowSolve(true)}>
                Accuse
              </Button>
            )}
          </div>
        </div>

        {showSolve && (
          <SolveCase
            mystery={mystery}
            maxAttempts={maxAttempts}
            wrongAttempts={session.wrongAttempts}
            maxSelections={maxSelections}
            importantEvidence={importantEvidence}
            onComplete={handleComplete}
            onFail={handleFail}
            onRejected={session.setWrongAttempts}
            onClose={() => setShowSolve(false)}
          />
        )}

        {showHint && (
          <HintPanel
            mystery={mystery}
            hintsUsed={session.hintsUsed}
            onHintUsed={session.recordHint}
            onClose={() => setShowHint(false)}
          />
        )}

        {showDetective && (
          <DetectiveChat
            mystery={mystery}
            onClose={() => setShowDetective(false)}
          />
        )}

        {alibiFor && (
          <AlibiSheet
            mystery={mystery}
            suspect={mystery.suspects.find((s) => s.id === alibiFor)!}
            onClose={() => setAlibiFor(null)}
            onBroken={() => {
              // Server-owned; the next poll brings it back authoritatively.
            }}
          />
        )}

        {confrontFor && (
          <InterrogateSheet
            mystery={mystery}
            suspect={mystery.suspects.find((s) => s.id === confrontFor)!}
            onClose={() => setConfrontFor(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg tabular-nums text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
