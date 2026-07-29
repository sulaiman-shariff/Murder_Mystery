import { NextResponse } from "next/server";

const AI_MODEL = process.env.AI_MODEL || "gemini-2.5-flash-lite";
const AI_API_KEY = process.env.AI_API_KEY;

export async function GET() {
  if (!AI_API_KEY) {
    return NextResponse.json(
      { status: "unavailable", reason: "AI_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(endpoint, {
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
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const details = await res.text();
      return NextResponse.json(
        { status: "unavailable", model: AI_MODEL, error: details },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "ready",
      model: AI_MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "unavailable",
        model: AI_MODEL,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
