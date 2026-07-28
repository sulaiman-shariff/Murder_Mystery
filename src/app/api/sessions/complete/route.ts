import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`sessions:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { teamId, mysteryId, status, score, wrongAttempts, hintsUsed, elapsedSeconds } = body;

    if (!teamId || !mysteryId || !status) {
      return NextResponse.json(
        { error: "teamId, mysteryId, and status are required" },
        { status: 400 }
      );
    }

    if (!["completed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'completed' or 'failed'" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: session } = await supabase
      .from("game_sessions")
      .select("id")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .in("status", ["not_started", "in_progress"])
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "No active session found for this team and mystery" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("game_sessions")
      .update({
        status,
        score: score ?? 0,
        wrong_attempts: wrongAttempts ?? 0,
        hints_used: hintsUsed ?? 0,
        completed_at: status === "completed" ? now : null,
        last_saved_at: now,
      })
      .eq("id", session.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Session complete API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
