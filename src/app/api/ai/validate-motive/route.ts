import { NextRequest, NextResponse } from "next/server";
import { validateMotive } from "@/lib/ai/client";
import { getMysteryById } from "@/data/mystery-index";
import { logAiInteraction } from "@/lib/database/ai-log";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`validate-motive:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { guess, mysteryId, sessionId } = body;

    if (!guess || !mysteryId) {
      return NextResponse.json(
        { error: "Guess and mysteryId are required" },
        { status: 400 }
      );
    }

    if (typeof guess !== "string" || guess.length > 500) {
      return NextResponse.json(
        { error: "Motive guess must be 500 characters or fewer" },
        { status: 400 }
      );
    }

    const mystery = getMysteryById(mysteryId);
    if (!mystery) {
      return NextResponse.json(
        { error: "Mystery not found" },
        { status: 404 }
      );
    }

    const result = await validateMotive({
      playerMotive: guess,
      canonicalMotive: mystery.solution.motiveSummary,
      requiredConcepts: mystery.solution.motiveRequiredConcepts,
      acceptableInterpretations: mystery.solution.acceptableMotiveInterpretations,
      mysteryContext: `${mystery.title}: ${mystery.introduction}`,
    });

    logAiInteraction(sessionId, "motive_validation", guess, JSON.stringify(result));

    return NextResponse.json(result);
  } catch (err) {
    console.error("validate-motive error:", err);
    return NextResponse.json(
      {
        correct: false,
        confidence: 0,
        matchedConcepts: [],
        missingConcepts: [],
        feedback:
          "We couldn't validate that answer right now. Your attempt was not counted. Please try again.",
      },
      { status: 200 }
    );
  }
}
