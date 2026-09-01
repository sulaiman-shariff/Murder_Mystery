import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { getSolutionById } from "@/data/solutions";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Returns the solution for a mystery, but only to a team that has already
 * finished it. This is the single client-facing door to spoiler content:
 * the win and lost screens call it after the case is over.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mysteryId: string }> }
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const limitCheck = checkRateLimit(`reveal:${ip}`);
    if (limitCheck) return limitCheck;

    const { mysteryId } = await params;
    const teamId = request.nextUrl.searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const solution = getSolutionById(mysteryId);
    if (!solution) {
      return NextResponse.json({ error: "Mystery not found" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: session } = await supabase
      .from("game_sessions")
      .select("status")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session || (session.status !== "completed" && session.status !== "failed")) {
      return NextResponse.json(
        { error: "This case is still open." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      murderer: solution.murderer,
      murdererDescription: solution.murdererDescription,
      motiveSummary: solution.motiveSummary,
      explanation: solution.explanation,
    });
  } catch (err) {
    console.error("reveal error:", err);
    return NextResponse.json(
      { error: "Could not load the case solution." },
      { status: 500 }
    );
  }
}
