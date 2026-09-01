import type { MurdererValidationResult, MotiveValidationResult, SuspectRecord } from "@/types";

const AI_API_KEY = process.env.AI_API_KEY?.trim();
// Trimmed because a stray space in the configured value makes Gemini
// reject every request with "unexpected model name format", which turns
// into a silent "validation unavailable" for players mid-game.
const AI_MODEL = process.env.AI_MODEL?.replace(/\s+/g, "") || "gemini-2.5-flash-lite";
const CONFIDENCE_THRESHOLD = 0.7;

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

async function callGemini(
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    responseSchema?: Record<string, unknown>;
  } = {}
): Promise<string> {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY not configured");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.2,
    },
  };

  if (options.responseSchema) {
    body.generationConfig = {
      ...(body.generationConfig as Record<string, unknown>),
      response_mime_type: "application/json",
      response_schema: options.responseSchema,
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-goog-api-key": AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const details = await res.text();
      throw new Error(`Gemini API error: ${details}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty response");
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanJson(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

const MURDERER_SCHEMA = {
  type: "object",
  properties: {
    correct: { type: "boolean" },
    confidence: { type: "number" },
    // Gemini's response schema is an OpenAPI subset: it rejects union
    // types like ["string","null"] outright, which made every murderer
    // validation fail as "unavailable". Nullability goes here instead.
    matchedSuspectId: { type: "string", nullable: true },
    feedback: { type: "string" },
    ambiguous: { type: "boolean" },
  },
  required: ["correct", "confidence", "matchedSuspectId", "feedback", "ambiguous"],
} as const;

const MOTIVE_SCHEMA = {
  type: "object",
  properties: {
    correct: { type: "boolean" },
    confidence: { type: "number" },
    matchedConcepts: { type: "array", items: { type: "string" } },
    missingConcepts: { type: "array", items: { type: "string" } },
    feedback: { type: "string" },
  },
  required: ["correct", "confidence", "matchedConcepts", "missingConcepts", "feedback"],
} as const;

/**
 * Last line of defence on the spoiler rule.
 *
 * The model has been observed replying to a wrong guess with wording that
 * names the killer outright ("...is a valid alias for X. However, X is not
 * the murderer."). Prompt wording alone cannot guarantee this never happens,
 * so any non-correct verdict whose feedback mentions the murderer or one of
 * their aliases is replaced with a neutral message.
 */
function safeFeedback(
  feedback: string,
  status: string,
  correctMurderer: string,
  aliases: string[]
): string {
  const text = (feedback || "").slice(0, 300);
  if (status === "correct") return text;

  const haystack = text.toLowerCase();
  const forbidden = [correctMurderer, ...aliases, ...correctMurderer.split(/\s+/)]
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 2);

  if (forbidden.some((term) => haystack.includes(term))) {
    return status === "ambiguous"
      ? "That could point at more than one person. Name them more precisely."
      : "That is not your killer. Go back over the evidence and the alibis.";
  }

  return text;
}

export async function validateMurderer(params: {
  guess: string;
  correctMurderer: string;
  suspects: SuspectRecord[];
}): Promise<MurdererValidationResult> {
  const suspectList = params.suspects
    .map(
      (s) =>
        `ID: ${s.id} | Name: ${s.name} | Role: ${s.role} | Aliases: ${s.aliases.join(", ") || "none"}`
    )
    .join("\n");

  const prompt = `You are validating a murderer guess in a murder mystery game.

Correct murderer: ${params.correctMurderer}

Suspects:
${suspectList}

Player's guess: "${params.guess}"

Work out which suspect the guess refers to, then decide.

Step 1 - resolve the guess to a suspect:
- Match on full name, first name alone, surname alone, title, nickname, role, or any listed alias.
- Ignore case, punctuation and small spelling slips.
- If it resolves to exactly one suspect, that is the match.
- If it could equally be two or more suspects, there is no match: set ambiguous=true, correct=false.

Step 2 - decide:
- correct=true if and only if the matched suspect IS the correct murderer named above.
- correct=false otherwise.
- The aliases listed against the correct murderer were authored to be accepted: if the guess resolves to one of them, correct MUST be true. Do not second-guess this.

Step 3 - write feedback (under 200 characters):
- If correct: confirm it plainly.
- If incorrect: say only that this is not the killer and suggest re-reading the evidence. NEVER name, describe, hint at or rule anyone in or out. Do not mention the correct murderer's name or aliases under any circumstance. Do not say the guess was "close".

Other:
- confidence is how sure you are of the resolution in step 1, 0 to 1.
- matchedSuspectId must be a real suspect ID from the list above, or null.`;

  try {
    const raw = await callGemini(prompt, {
      maxTokens: 300,
      temperature: 0,
      responseSchema: MURDERER_SCHEMA as Record<string, unknown>,
    });
    const parsed = JSON.parse(cleanJson(raw));

    if (
      typeof parsed.correct !== "boolean" ||
      typeof parsed.confidence !== "number" ||
      (parsed.matchedSuspectId !== null && typeof parsed.matchedSuspectId !== "string") ||
      typeof parsed.feedback !== "string" ||
      typeof parsed.ambiguous !== "boolean"
    ) {
      return {
        correct: false,
        confidence: 0,
        matchedSuspectId: null,
        feedback: "We couldn't validate that answer right now. Please try again.",
        ambiguous: false,
        status: "unavailable",
      };
    }

    const confidence = Math.max(0, Math.min(1, parsed.confidence));
    const isAmbiguous = parsed.ambiguous || confidence < CONFIDENCE_THRESHOLD;
    const isValidSuspectId =
      parsed.matchedSuspectId === null ||
      params.suspects.some((s) => s.id === parsed.matchedSuspectId);

    if (!isValidSuspectId) {
      parsed.matchedSuspectId = null;
    }

    let status: "correct" | "incorrect" | "ambiguous" | "unavailable";
    if (parsed.correct && !isAmbiguous) {
      status = "correct";
    } else if (isAmbiguous) {
      status = "ambiguous";
    } else {
      status = "incorrect";
    }

    return {
      correct: parsed.correct,
      confidence,
      matchedSuspectId: isValidSuspectId ? parsed.matchedSuspectId : null,
      feedback: safeFeedback(
        parsed.feedback,
        status,
        params.correctMurderer,
        params.suspects.find((s) => s.name === params.correctMurderer)?.aliases ?? []
      ),
      ambiguous: isAmbiguous,
      status,
    };
  } catch {
    return {
      correct: false,
      confidence: 0,
      matchedSuspectId: null,
      feedback: "We couldn't validate that answer right now. Please try again.",
      ambiguous: false,
      status: "unavailable",
    };
  }
}

export async function validateMotive(params: {
  playerMotive: string;
  canonicalMotive: string;
  requiredConcepts: string[];
  acceptableInterpretations: string[];
  commonIncorrectInterpretations: string[];
  mysteryContext: string;
}): Promise<MotiveValidationResult> {
  const prompt = `You are validating a motive answer in a murder mystery game.

Canonical motive: "${params.canonicalMotive}"
Required concepts: ${params.requiredConcepts.join(", ")}
Acceptable interpretations: ${params.acceptableInterpretations.join(", ")}
Common but INCORRECT interpretations (reject these): ${params.commonIncorrectInterpretations.join(", ") || "none"}
Mystery context: ${params.mysteryContext}
Player's answer: "${params.playerMotive}"

Decide one thing only: has the player worked out WHY the murder happened?

Who you are judging: a guest at a party, typing a sentence or two on a phone.
They write plainly and briefly. They will not use the vocabulary above, and
they must never be required to.

The listed concepts describe the IDEA behind the motive. They are not words
the player has to say, and they are not a checklist to tick off. An answer
that conveys the same reason in ordinary language is exactly as correct as
the canonical wording. "He was angry that his painting got cancelled" and a
polished paragraph about artistic betrayal are the SAME ANSWER.

Mark correct=true when the player has named the essential reason - the thing
that actually drove the killer - even if they:
- use casual, vague or misspelled wording
- give only the single main reason and omit the surrounding nuance
- describe the cause in their own terms rather than the canonical terms
- write one short sentence

Mark correct=false ONLY when the player:
- names a genuinely different reason (money, inheritance, an affair, a
  robbery, self-defence) - including any of the incorrect interpretations above
- is so generic it would fit any murder at all ("he was angry", "they hated
  each other") with nothing tying it to this case
- has clearly not understood what happened

When in doubt between "vague but right" and "wrong", choose correct=true.
Being too strict costs a player their attempt for an answer they had right,
which is the worse mistake here.

confidence = how sure you are of YOUR VERDICT, from 0 to 1. It is NOT a score
for how much of the canonical wording appeared. A clearly wrong answer gets
HIGH confidence with correct=false. Use a value below 0.7 only when the answer
is genuinely too short or muddled to judge either way.

matchedConcepts/missingConcepts are internal notes for the organisers only.
They are never shown to the player and must not drive your verdict.

Feedback (under 200 characters):
- correct: confirm it warmly and plainly.
- incorrect: nudge them toward the right area without naming the reason,
  the killer, or any concept from the lists above.`;

  try {
    const raw = await callGemini(prompt, {
      maxTokens: 400,
      temperature: 0,
      responseSchema: MOTIVE_SCHEMA as Record<string, unknown>,
    });
    const parsed = JSON.parse(cleanJson(raw));

    if (
      typeof parsed.correct !== "boolean" ||
      typeof parsed.confidence !== "number" ||
      !Array.isArray(parsed.matchedConcepts) ||
      !Array.isArray(parsed.missingConcepts) ||
      typeof parsed.feedback !== "string"
    ) {
      return {
        correct: false,
        confidence: 0,
        matchedConcepts: [],
        missingConcepts: [],
        feedback: "We couldn't validate that answer right now. Please try again.",
        status: "unavailable",
      };
    }

    const confidence = Math.max(0, Math.min(1, parsed.confidence));

    // Confidence is certainty about the verdict, not how much canonical
    // wording appeared, so it no longer decides correctness on its own.
    // Previously anything under the threshold became "ambiguous", which both
    // bounced plainly-worded right answers and let obviously wrong ones off
    // as "needs more detail".
    let status: "correct" | "incorrect" | "ambiguous" | "unavailable";
    if (confidence < CONFIDENCE_THRESHOLD) {
      status = "ambiguous";
    } else {
      status = parsed.correct ? "correct" : "incorrect";
    }

    return {
      correct: parsed.correct,
      confidence,
      matchedConcepts: parsed.matchedConcepts.slice(0, 10),
      missingConcepts: parsed.missingConcepts.slice(0, 10),
      feedback: parsed.feedback.slice(0, 300),
      status,
    };
  } catch {
    return {
      correct: false,
      confidence: 0,
      matchedConcepts: [],
      missingConcepts: [],
      feedback: "We couldn't validate that answer right now. Please try again.",
      status: "unavailable",
    };
  }
}

export async function generateHint(params: {
  mysteryContext: string;
  level: number;
  objective: string;
  maximumRevelation: string;
  relevantEvidence: string[];
}): Promise<string> {
  const prompt = `You are a detective giving a hint in a murder mystery game.

Mystery context: ${params.mysteryContext}
Hint level ${params.level}.
Objective: ${params.objective}
Relevant evidence: ${params.relevantEvidence.join(", ")}

Rules:
- Never name the murderer
- Never confirm or deny a specific suspect
- Only use facts from the supplied case data
- Keep it brief for mobile reading
- Maximum revelation: ${params.maximumRevelation}

Respond with only the hint text, no formatting.`;

  try {
    return await callGemini(prompt, { maxTokens: 200, temperature: 0.7 });
  } catch {
    throw new Error("Hint generation unavailable");
  }
}

export async function detectiveChat(params: {
  mysteryContext: string;
  suspects: string;
  evidence: string;
  timeline: string;
  conversationHistory: string;
  playerQuestion: string;
}): Promise<string> {
  const prompt = `You are a detective helping players solve a murder mystery.

Mystery: ${params.mysteryContext}
Suspects: ${params.suspects}
Evidence: ${params.evidence}
Timeline: ${params.timeline}

Previous conversation:
${params.conversationHistory}

Player: ${params.playerQuestion}

Rules:
- Answer only from supplied case data
- Never create evidence or change relationships
- Never directly name the murderer
- Never confirm or deny a suspect accusation
- Point toward evidence and contradictions
- Keep responses brief for mobile

Detective:`;

  try {
    return await callGemini(prompt, { maxTokens: 300, temperature: 0.7 });
  } catch {
    throw new Error("Detective chat unavailable");
  }
}
