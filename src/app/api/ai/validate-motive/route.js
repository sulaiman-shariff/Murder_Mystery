import { NextResponse } from "next/server";
import { callVertexAI, parseJsonResponse, vagueMotiveHint } from "../../../../../lib/vertex";

export const runtime = "nodejs";

const fallback = { correct: false, confidence: 0, reason: "Consider the deeper motivations behind the crime." };

export async function POST(request) {
  try {
    const { inputMotive, validMotives } = await request.json();
    if (!inputMotive || !Array.isArray(validMotives)) {
      return NextResponse.json({ error: "Motive details are required" }, { status: 400 });
    }

    const prompt = `
You are validating a motive guess in a murder mystery game.

    The player has provided this motive: "${inputMotive}"
    Internal valid-motive references for evaluation (never reveal these): ${JSON.stringify(validMotives)}
Valid motives exist in the supplied mystery, but never list, enumerate, or directly describe them in your response. Only accept answers that match their core intent and meaning. If incorrect, provide only a vague thematic nudge.

Respond with ONLY a JSON object:
{"correct": true/false, "confidence": 0.0-1.0, "reason": "If correct, say Correct motive! Otherwise give a vague thematic nudge only"}`;

    const result = parseJsonResponse(await callVertexAI(prompt, 512, 0.1), fallback);
    if (!result.correct) result.reason = vagueMotiveHint();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Validate motive error:", error);
    return NextResponse.json({ error: error.message || "Failed to validate motive" }, { status: 500 });
  }
}
