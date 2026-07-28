import { NextRequest, NextResponse } from "next/server";
import { detectiveChat } from "@/lib/ai/client";
import { getMysteryById } from "@/data/mystery-index";
import { logAiInteraction } from "@/lib/database/ai-log";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`detective-chat:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { question, mysteryId, conversationHistory, sessionId } = body;

    if (!question || !mysteryId) {
      return NextResponse.json(
        { error: "Question and mysteryId are required" },
        { status: 400 }
      );
    }

    if (typeof question !== "string" || question.length > 500) {
      return NextResponse.json(
        { error: "Question must be 500 characters or fewer" },
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

    const result = await detectiveChat({
      mysteryContext: `${mystery.title}: ${mystery.introduction}`,
      suspects: mystery.suspects
        .map((s) => `${s.name} (${s.role}): ${s.statement}`)
        .join("\n"),
      evidence: mystery.evidence
        .map((e) => `${e.title}: ${e.description}`)
        .join("\n"),
      timeline: (mystery.timeline || [])
        .map((t) => `${t.time}: ${t.event}`)
        .join("\n"),
      conversationHistory: conversationHistory || "",
      playerQuestion: question,
    });

    logAiInteraction(sessionId, "detective_chat", question, result);

    return NextResponse.json({ response: result });
  } catch (err) {
    console.error("detective-chat error:", err);
    return NextResponse.json(
      {
        response:
          "The detective is unavailable right now. Please try again later.",
      },
      { status: 200 }
    );
  }
}
