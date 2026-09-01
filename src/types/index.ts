// ── Mystery types ──

export interface Victim {
  name: string;
  role: string;
  age?: number;
  description: string;
}

export interface StorySection {
  id: string;
  title: string;
  content: string;
}

/** A named location on the case map. Lets alibis and sightings be compared. */
export interface Place {
  id: string;
  name: string;
}

/**
 * What a suspect *claims*. Public by definition — an alibi is something they
 * say out loud. Whether it is false is authored server-side, never here.
 */
export interface AlibiClaim {
  id: string;
  /** Verbatim, in the suspect's own voice. This is what the player reads. */
  claim: string;
  placeId: string;
  /** Case-clock minutes (see Mystery.timeline). */
  from: number;
  to: number;
  /**
   * Who says they can vouch for it. An empty array means uncorroborated,
   * and the UI says so — that is information the player is entitled to.
   */
  corroboratedBy: string[];
}

export interface Suspect {
  id: string;
  name: string;
  role: string;
  image?: string;
  relationshipToVictim: string;
  statement: string;
  alibi?: AlibiClaim;
  suspiciousDetails: string[];
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  /**
   * Who this item names, is about, or was produced by. Purely navigational —
   * it does NOT mean "this implicates them", and the count must never be
   * displayed: tag frequency alone used to fingerprint the murderer.
   */
  mentionsSuspectIds: string[];
  /** 1-4. Drives reading order today; reserved for progressive unlock. */
  unlockStage?: number;
  /** Case-clock minutes, where the item places something in time. */
  observedAt?: number;
}

export type EvidenceCategory =
  | "physical"
  | "statement"
  | "timeline"
  | "document"
  | "digital";

export type EvidenceFilter = EvidenceCategory | "all";

export interface TimelineEvent {
  id: string;
  /**
   * Minutes on this mystery's own case clock. Sortable and comparable;
   * never rendered. The prose `time` below is unsortable by design
   * ("Nightfall + 15 min"), so ordering and window maths use this.
   */
  t: number;
  /** What the player reads: "9:15 PM", "Twilight". */
  time: string;
  event: string;
  placeId?: string;
  /**
   * Set ONLY when the suspect's own account places them here — a public,
   * corroborated fact. Never used to mean "this is who it was".
   */
  relatedSuspectId?: string;
}

export interface HintLevel {
  level: number;
  relevantEvidenceIds: string[];
  objective: string;
  maximumRevelation: string;
}

export interface MysterySolution {
  murderer: string;
  murdererAliases: string[];
  murdererDescription: string;
  motiveSummary: string;
  motiveRequiredConcepts: string[];
  acceptableMotiveInterpretations: string[];
  commonIncorrectMotiveInterpretations: string[];
  explanation: string;
  decisiveEvidenceIds: string[];
}

export interface Mystery {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  victim: Victim;
  introduction: string;
  storySections: StorySection[];
  suspects: Suspect[];
  evidence: Evidence[];
  timeline?: TimelineEvent[];
  places?: Place[];
  /**
   * How many hint levels this mystery has. The hints themselves are spoilers
   * and live server-side in src/data/solutions.ts; the client only needs the
   * count to know whether more hints remain.
   */
  hintCount: number;
}

// ── Game session types ──

export interface ScoringSettings {
  baseScore: number;
  wrongAttemptPenalty: number;
  hintPenalty: number;
  timePenaltyPerMinute: number;
  speedBonusThresholdMinutes: number;
  speedBonus: number;
  minimumScore: number;
  /** Bonuses for the optional deduction tools. These only ever add. */
  proofBonus: number;
  alibiBonusPerBreak: number;
  alibiBonusCap: number;
  boardAccuracyBonus: number;
  interrogationBonus: number;
}

export interface ScoreInput {
  elapsedSeconds: number;
  wrongAttempts: number;
  hintsUsed: number;
  completed: boolean;
}

export interface ScoreResult {
  score: number;
  elapsedSeconds: number;
  wrongAttempts: number;
  hintsUsed: number;
  penalties: number;
  bonus: number;
}

// ── AI types ──

export type ValidationStatus = "correct" | "incorrect" | "ambiguous" | "unavailable";

export interface SuspectRecord {
  id: string;
  name: string;
  role: string;
  aliases: string[];
}

export interface MurdererValidationResult {
  correct: boolean;
  confidence: number;
  matchedSuspectId: string | null;
  feedback: string;
  ambiguous: boolean;
  status: ValidationStatus;
}

export interface MotiveValidationResult {
  correct: boolean;
  confidence: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
  status: ValidationStatus;
}

export interface HintRequest {
  sessionId: string;
  level: number;
}

export interface HintResponse {
  success: boolean;
  hint?: string;
  level?: number;
  penaltyApplied: boolean;
  reason?: "no_more_hints" | "unavailable";
}

export interface DetectiveChatMessage {
  role: "player" | "detective";
  content: string;
  timestamp: string;
}

// ── Database types ──

export type EventStatus = "draft" | "open" | "paused" | "closed";

export interface GameEvent {
  id: string;
  name: string;
  eventCode: string;
  status: EventStatus;
  createdAt: string;
  startsAt?: string;
  endsAt?: string;
  scoringSettings: ScoringSettings;
  currentMysteryLimit: number;
  maxAttempts: number;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  pin: string;
  createdAt: string;
  lastActiveAt: string;
}

export type SessionStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "failed";

export interface GameSession {
  id: string;
  eventId: string;
  teamId: string;
  mysteryId: string;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  wrongAttempts: number;
  hintsUsed: number;
  score: number;
  elapsedSeconds: number;
  state: Record<string, unknown>;
  lastSavedAt: string;
}

export type AiInteractionType =
  | "murderer_validation"
  | "motive_validation"
  | "hint"
  | "detective_chat"
  | "interrogation";

export interface AiInteraction {
  id: string;
  sessionId: string;
  type: AiInteractionType;
  playerInput: string;
  aiOutput: string;
  createdAt: string;
}

// ── API types ──

export interface RegisterTeamRequest {
  name: string;
  pin: string;
  eventCode: string;
}

export interface RegisterTeamResponse {
  team: Team;
  session: GameSession | null;
}

export interface LoginTeamRequest {
  name: string;
  pin: string;
  eventCode: string;
}

export interface LoginTeamResponse {
  team: Team;
  activeSession: GameSession | null;
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  totalScore: number;
  totalTime: number;
  mysteriesCompleted: number;
  hintsUsed: number;
  wrongAttempts: number;
}

// ── Admin API shapes ──
// What the /api/admin/* routes actually return, so the admin UI does not
// have to redeclare them locally.

export interface AdminSessionInfo {
  mysteryId: string;
  status: SessionStatus;
  wrongAttempts: number;
  hintsUsed: number;
  score: number;
  elapsedSeconds: number;
  startedAt: string;
  completedAt: string | null;
  lastSavedAt: string;
}

export interface AdminTeam {
  id: string;
  name: string;
  pin: string;
  eventId: string;
  createdAt: string;
  lastActiveAt: string;
  sessions: AdminSessionInfo[];
}

export interface AdminEvent {
  id: string;
  name: string;
  eventCode: string;
  status: EventStatus;
  createdAt: string;
  scoringSettings: Partial<ScoringSettings> | null;
  currentMysteryLimit: number;
  maxAttempts: number;
}

/** Rows come back in the database's snake_case, unlike the other endpoints. */
export interface AdminAiLog {
  id: string;
  session_id: string;
  type: AiInteractionType;
  player_input: string;
  ai_output: string;
  created_at: string;
}

// ── Deduction types ──
// The interfaces are safe here (types are erased at build time); the DATA that
// fills them is authored in src/data/deduction.ts, which is server-only.

/** What a submitted proof set was judged to be. */
export type ProofVerdict = "proven" | "incomplete" | "unfocused" | "over-cap";

export interface ProofGrade {
  verdict: ProofVerdict;
  /** How many required clues are absent. Counts only — never which. */
  missingCount: number;
  /** How many selected clues prove nothing. */
  noiseCount: number;
  required: number;
  maxSelections: number;
}

/** What breaking an alibi actually establishes. Not always guilt. */
export type AlibiConsequence = "places-at-scene" | "eliminates" | "weakens";

/** How a suspect answers when shown a particular piece of evidence. */
export type ConfrontationPosture = "deny" | "deflect" | "crack" | "concede";

export interface InterrogationTurn {
  suspectId: string;
  evidenceId: string;
  reply: string;
  at: number;
}

/** One link on the case board: the team's own assertion, never graded live. */
export interface BoardPin {
  evidenceId: string;
  suspectId: string;
  at: number;
}
