import { NextRequest, NextResponse } from "next/server";
import { generateHint } from "@/lib/ai/client";
import { getMysteryById } from "@/data/mystery-index";
import { logAiInteraction } from "@/lib/database/ai-log";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`hint:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { mysteryId, level, sessionId } = body;

    if (!mysteryId || level === undefined) {
      return NextResponse.json(
        { error: "mysteryId and level are required" },
        { status: 400 }
      );
    }

    if (typeof level !== "number" || level < 0 || level > 10) {
      return NextResponse.json(
        { error: "level must be a number between 0 and 10" },
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

    const hintLevel = mystery.hintPlan.find((h) => h.level === level);
    if (!hintLevel) {
      const message = "No more hints available. Trust your detective instincts!";
      logAiInteraction(sessionId, "hint", `Level ${level}`, message);
      return NextResponse.json({ hint: message, level }, { status: 200 });
    }

    let hint: string;
    try {
      hint = await generateHint({
        mysteryContext: `${mystery.title}: ${mystery.introduction}`,
        level,
        objective: hintLevel.objective,
        maximumRevelation: hintLevel.maximumRevelation,
        relevantEvidence: hintLevel.relevantEvidenceIds.map((id) => {
          const ev = mystery.evidence.find((e) => e.id === id);
          return ev ? `${ev.title}: ${ev.description}` : id;
        }),
      });
    } catch {
      hint = hintLevel.objective;
    }

    logAiInteraction(sessionId, "hint", `Level ${level} requested`, hint);
    return NextResponse.json({ hint, level });
  } catch (err) {
    console.error("hint error:", err);
    return NextResponse.json(
      {
        hint: "Hint generation unavailable right now. Please try again.",
        level: 0,
      },
      { status: 200 }
    );
  }
}
