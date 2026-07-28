import { NextResponse } from "next/server";
import { callVertexAI, parseJsonResponse } from "../../../../../lib/vertex";

export const runtime = "nodejs";

const fallback = { correct: false, confidence: 0.5, reason: "Unable to validate guess" };

export async function POST(request) {
  try {
    const { guess, correctMurderer, mystery } = await request.json();
    if (!guess || !correctMurderer || !mystery?.title) {
      return NextResponse.json({ error: "Guess and mystery details are required" }, { status: 400 });
    }

    const prompt = `
You are validating a murderer guess in a murder mystery game.

Mystery: ${mystery.title}
Correct murderer: ${correctMurderer}
Player's guess: ${guess}

Determine if the player's guess refers to the correct murderer. Consider nicknames, partial names, common misspellings, and titles. If the guess is incorrect, DO NOT reveal or reference the correct murderer's name or any part of it.

Respond with ONLY a JSON object:
{"correct": true/false, "confidence": 0.0-1.0, "reason": "brief explanation (never reveal the correct name if incorrect)"}`;

    return NextResponse.json(parseJsonResponse(await callVertexAI(prompt, 256, 0.1), fallback));
  } catch (error) {
    console.error("Validate murderer error:", error);
    return NextResponse.json({ error: error.message || "Failed to validate murderer" }, { status: 500 });
  }
}
