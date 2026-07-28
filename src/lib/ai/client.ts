const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "gemini-2.0-flash-lite";

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

async function callGemini(
  prompt: string,
  maxTokens = 512,
  temperature = 0.2
): Promise<string> {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY not configured");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-goog-api-key": AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
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

export async function validateMurderer(params: {
  guess: string;
  correctMurderer: string;
  aliases: string[];
  suspectNames: string[];
  suspectRoles: string[];
}): Promise<{
  correct: boolean;
  confidence: number;
  matchedSuspectId: string | null;
  feedback: string;
  ambiguous: boolean;
}> {
  const prompt = `You are validating a murderer guess in a murder mystery game.

Correct murderer: ${params.correctMurderer}
Known aliases: ${params.aliases.join(", ")}
Suspects: ${params.suspectNames.join(", ")}
Roles: ${params.suspectRoles.join(", ")}
Player's guess: "${params.guess}"

Determine if the player's guess refers to the correct murderer.

Rules:
- Accept full names, first/last names, titles, nicknames, minor misspellings
- Accept descriptions only when they clearly identify one specific suspect
- If ambiguous (could refer to multiple suspects), mark ambiguous=true
- Never reveal the correct answer when incorrect
- Never mention which suspect was "close"
- Low confidence → ambiguous=true

Respond with ONLY valid JSON:
{
  "correct": boolean,
  "confidence": number (0-1),
  "matchedSuspectId": string | null,
  "feedback": "brief player-facing message",
  "ambiguous": boolean
}`;

  try {
    const raw = await callGemini(prompt, 300, 0.1);
    return JSON.parse(cleanJson(raw));
  } catch {
    return {
      correct: false,
      confidence: 0,
      matchedSuspectId: null,
      feedback: "We couldn't validate that answer right now. Please try again.",
      ambiguous: false,
    };
  }
}

export async function validateMotive(params: {
  playerMotive: string;
  canonicalMotive: string;
  requiredConcepts: string[];
  acceptableInterpretations: string[];
  mysteryContext: string;
}): Promise<{
  correct: boolean;
  confidence: number;
  matchedConcepts: string[];
  missingConcepts: string[];
  feedback: string;
}> {
  const prompt = `You are validating a motive answer in a murder mystery game.

Canonical motive: "${params.canonicalMotive}"
Required concepts: ${params.requiredConcepts.join(", ")}
Acceptable interpretations: ${params.acceptableInterpretations.join(", ")}
Mystery context: ${params.mysteryContext}
Player's answer: "${params.playerMotive}"

Determine if the player's answer captures the core reason for the murder.

Rules:
- Accept good paraphrases that include the required concepts
- Reject overly broad answers
- Reject plausible but incorrect motives
- Reject answers missing the core reason
- Never expose the exact missing answer
- When incorrect, give only a vague directional nudge

Respond with ONLY valid JSON:
{
  "correct": boolean,
  "confidence": number (0-1),
  "matchedConcepts": ["concepts the player got right"],
  "missingConcepts": ["concepts they missed"],
  "feedback": "player-facing message"
}`;

  try {
    const raw = await callGemini(prompt, 400, 0.1);
    return JSON.parse(cleanJson(raw));
  } catch {
    return {
      correct: false,
      confidence: 0,
      matchedConcepts: [],
      missingConcepts: [],
      feedback: "We couldn't validate that answer right now. Please try again.",
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
    return await callGemini(prompt, 200, 0.7);
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
    return await callGemini(prompt, 300, 0.7);
  } catch {
    throw new Error("Detective chat unavailable");
  }
}
