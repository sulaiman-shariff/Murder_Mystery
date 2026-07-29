import type { MurdererValidationResult, MotiveValidationResult, SuspectRecord } from "@/types";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gemini-2.5-flash-lite";
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
    matchedSuspectId: { type: ["string", "null"] },
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

Determine if the player's guess refers to the correct murderer.

Rules:
- Accept full names, partial names, first/last names, titles, nicknames, minor misspellings
- Accept descriptions only when they clearly identify exactly ONE specific suspect
- If ambiguous (could refer to multiple suspects), set ambiguous=true and correct=false
- Never reveal the correct answer when incorrect
- Never mention which suspect was "close"
- Confidence below 0.7 = ambiguous=true
- matchedSuspectId must be a real suspect ID from the list above, or null
- Keep feedback under 200 characters
- Incorrect feedback must not reveal the solution`;

  try {
    const raw = await callGemini(prompt, {
      maxTokens: 300,
      temperature: 0.1,
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
      feedback: parsed.feedback.slice(0, 300),
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

Determine if the player's answer captures the core reason for the murder.

Rules:
- Accept good paraphrases that include the required concepts
- Distinguish between partially correct and fully correct motives
- Reject overly broad answers
- Reject plausible but incorrect motives (especially common misinterpretations listed above)
- Reject answers missing the core reason
- Never expose the exact missing answer
- When incorrect, give only a vague directional nudge (do NOT list missingConcepts to the player)
- Keep feedback under 200 characters
- Confidence below 0.7 → correct=false`;

  try {
    const raw = await callGemini(prompt, {
      maxTokens: 400,
      temperature: 0.1,
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

    let status: "correct" | "incorrect" | "ambiguous" | "unavailable";
    if (parsed.correct && confidence >= CONFIDENCE_THRESHOLD) {
      status = "correct";
    } else if (confidence < CONFIDENCE_THRESHOLD && confidence > 0) {
      status = "ambiguous";
    } else {
      status = "incorrect";
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
