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

export interface Suspect {
  id: string;
  name: string;
  role: string;
  image?: string;
  relationshipToVictim: string;
  statement: string;
  alibi?: string;
  suspiciousDetails: string[];
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  relatedSuspectIds: string[];
  unlockStage?: number;
}

export type EvidenceCategory =
  | "physical"
  | "statement"
  | "timeline"
  | "document"
  | "digital";

export type EvidenceFilter = EvidenceCategory | "all";

export interface TimelineEvent {
  time: string;
  event: string;
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
  solution: MysterySolution;
  hintPlan: HintLevel[];
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

export interface MurdererValidationResult {
  correct: boolean;
  confidence: number;
  matchedSuspectId: string | null;
  feedback: string;
  ambiguous: boolean;
}

export interface MotiveValidationResult {
  correct: boolean;
  confidence: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
}

export interface HintRequest {
  sessionId: string;
  level: number;
}

export interface HintResponse {
  hint: string;
  level: number;
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
  state: Record<string, unknown>;
  lastSavedAt: string;
}

export type AiInteractionType =
  | "murderer_validation"
  | "motive_validation"
  | "hint"
  | "detective_chat";

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
