import { NextRequest, NextResponse } from "next/server";
import { generateHint } from "@/lib/ai/client";
import { getMysteryById } from "@/data/mystery-index";
import { getHintLevel } from "@/data/solutions";
import { logAiInteraction } from "@/lib/database/ai-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireTeam } from "@/lib/auth/team-session";
import { createAdminClient } from "@/lib/supabase/server-admin";

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

    if (typeof level !== "number" || level < 1 || level > 10) {
      return NextResponse.json(
        { error: "level must be a number between 1 and 10" },
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

    const hintLevel = getHintLevel(mysteryId, level);
    if (!hintLevel) {
      return NextResponse.json({
        success: false,
        reason: "no_more_hints",
        penaltyApplied: false,
      });
    }

    let hint: string;
    let source: "ai" | "fallback" = "ai";
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
      source = "fallback";
    }

    logAiInteraction(sessionId, "hint", `Level ${level} requested`, hint);

    // The hint penalty is recorded server-side. It used to live only in the
    // client's counter, which the client then sent back at scoring time.
    const actor = requireTeam(request, body.teamId);
    if (!(actor instanceof NextResponse)) {
      const supabase = createAdminClient();
      const { data: row } = await supabase
        .from("game_sessions")
        .select("id, hints_used")
        .eq("team_id", actor.teamId)
        .eq("mystery_id", mysteryId)
        .in("status", ["not_started", "in_progress"])
        .order("last_saved_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (row) {
        await supabase
          .from("game_sessions")
          .update({ hints_used: Math.max(row.hints_used ?? 0, level) })
          .eq("id", row.id);
      }
    }

    return NextResponse.json({
      success: true,
      hint,
      level,
      penaltyApplied: true,
    });
  } catch (err) {
    console.error("hint error:", err);
    return NextResponse.json(
      {
        success: false,
        reason: "unavailable",
        penaltyApplied: false,
      },
      { status: 500 }
    );
  }
}
