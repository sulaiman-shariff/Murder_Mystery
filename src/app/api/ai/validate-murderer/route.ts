import { NextRequest, NextResponse } from "next/server";
import { validateMurderer } from "@/lib/ai/client";
import { getMysteryById } from "@/data/mystery-index";
import { getSolutionById } from "@/data/solutions";
import { logAiInteraction } from "@/lib/database/ai-log";
import { checkRateLimit } from "@/lib/rate-limit";
import type { SuspectRecord } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`validate-murderer:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { guess, mysteryId, sessionId } = body;

    if (!guess || !mysteryId) {
      return NextResponse.json(
        { error: "Guess and mysteryId are required" },
        { status: 400 }
      );
    }

    if (typeof guess !== "string" || guess.length > 300) {
      return NextResponse.json(
        { error: "Guess must be 300 characters or fewer" },
        { status: 400 }
      );
    }

    const mystery = getMysteryById(mysteryId);
    const solution = getSolutionById(mysteryId);
    if (!mystery || !solution) {
      return NextResponse.json(
        { error: "Mystery not found" },
        { status: 404 }
      );
    }

    // Every entry in murdererAliases is an alias for the murderer, so they
    // all belong to that suspect. The previous substring match quietly threw
    // away the descriptive ones the author wrote to be accepted ("the
    // artist", "the painter", "Mr. Reed"), and players using them were told
    // they were wrong and charged an attempt.
    const murdererName = solution.murderer.toLowerCase();
    const suspects: SuspectRecord[] = mystery.suspects.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      aliases:
        s.name.toLowerCase() === murdererName ? solution.murdererAliases : [],
    }));

    const result = await validateMurderer({
      guess,
      correctMurderer: solution.murderer,
      suspects,
    });

    logAiInteraction(sessionId, "murderer_validation", guess, JSON.stringify(result));

    return NextResponse.json(result);
  } catch (err) {
    console.error("validate-murderer error:", err);
    return NextResponse.json(
      {
        correct: false,
        confidence: 0,
        matchedSuspectId: null,
        feedback:
          "We couldn't validate that answer right now. Your attempt was not counted. Please try again.",
        ambiguous: false,
        status: "unavailable",
      },
      { status: 200 }
    );
  }
}
