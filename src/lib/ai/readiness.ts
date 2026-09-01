const AI_MODEL = (process.env.AI_MODEL || "gemini-2.5-flash-lite").replace(/\s+/g, "");
const AI_API_KEY = process.env.AI_API_KEY?.trim();

export interface AiReadiness {
  status: "ready" | "unavailable";
  model: string;
  latencyMs?: number;
  reason?: string;
  checkedAt: string;
  cached: boolean;
}

/**
 * Cached for a minute. The admin dashboard refreshes on a timer, and a real
 * generateContent call on every refresh is quota and money spent on nothing.
 */
let memo: { at: number; value: AiReadiness } | null = null;
const TTL_MS = 60_000;

export async function checkAiReadiness(force = false): Promise<AiReadiness> {
  if (!force && memo && Date.now() - memo.at < TTL_MS) {
    return { ...memo.value, cached: true };
  }

  const checkedAt = new Date().toISOString();

  if (!AI_API_KEY) {
    const value: AiReadiness = {
      status: "unavailable",
      model: AI_MODEL,
      reason: "AI_API_KEY is not configured",
      checkedAt,
      cached: false,
    };
    memo = { at: Date.now(), value };
    return value;
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": AI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with the single word: ok" }] }],
          generationConfig: { maxOutputTokens: 4, temperature: 0 },
        }),
        signal: controller.signal,
      }
    );

    const value: AiReadiness = res.ok
      ? {
          status: "ready",
          model: AI_MODEL,
          latencyMs: Date.now() - started,
          checkedAt,
          cached: false,
        }
      : {
          status: "unavailable",
          model: AI_MODEL,
          reason: `The model returned ${res.status}`,
          checkedAt,
          cached: false,
        };
    memo = { at: Date.now(), value };
    return value;
  } catch {
    const value: AiReadiness = {
      status: "unavailable",
      model: AI_MODEL,
      reason: "No response within five seconds",
      checkedAt,
      cached: false,
    };
    memo = { at: Date.now(), value };
    return value;
  } finally {
    clearTimeout(timeout);
  }
}
