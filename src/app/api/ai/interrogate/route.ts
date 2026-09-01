import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireTeam } from "@/lib/auth/team-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById } from "@/data/mystery-index";
import { getConfrontation } from "@/data/deduction";
import { getSolutionById } from "@/data/solutions";
import { interrogate, scrubInterrogation } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/database/ai-log";

/** Shared across the whole case: scarcity is what makes the choice a decision. */
const CONFRONTATIONS_PER_CASE = 6;

/**
 * Confront a suspect with one piece of evidence.
 *
 * The request carries IDs only and never free text, which makes prompt
 * injection impossible and means a player cannot ask the model something the
 * authors did not anticipate.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mysteryId, suspectId, evidenceId } = body;

    const actor = requireTeam(request, body.teamId);
    if (actor instanceof NextResponse) return actor;
    const teamId = actor.teamId;

    const limitCheck = checkRateLimit(`interrogate:${teamId}`);
    if (limitCheck) return limitCheck;

    const mystery = getMysteryById(mysteryId);
    const solution = getSolutionById(mysteryId);
    if (!mystery || !solution) {
      return NextResponse.json({ error: "Mystery not found" }, { status: 404 });
    }

    const suspect = mystery.suspects.find((s) => s.id === suspectId);
    const evidence = mystery.evidence.find((e) => e.id === evidenceId);
    if (!suspect || !evidence) {
      return NextResponse.json({ error: "Unknown suspect or evidence" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: session } = await supabase
      .from("game_sessions")
      .select("id, state")
      .eq("team_id", teamId)
      .eq("mystery_id", mysteryId)
      .in("status", ["not_started", "in_progress"])
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    const state = (session.state ?? {}) as Record<string, unknown>;
    const usedCount = typeof state.confrontationsUsed === "number"
      ? state.confrontationsUsed
      : 0;

    if (usedCount >= CONFRONTATIONS_PER_CASE) {
      return NextResponse.json({
        exhausted: true,
        remaining: 0,
        reply:
          "They have stopped answering you. You will have to work with what you already have.",
      });
    }

    // Unauthored pairs get a generic denial built from the suspect's own
    // public statement. Every pair must return something of comparable
    // substance, or "which pairs have real answers" becomes the answer key.
    const authored = getConfrontation(mysteryId, suspectId, evidenceId);
    const posture = authored?.posture ?? "deny";
    const beat =
      authored?.beat ??
      `They have nothing to add about this, and repeat what they already told you.`;

    let reply: string;
    try {
      const generated = await interrogate({
        suspectName: suspect.name,
        suspectRole: suspect.role,
        relationshipToVictim: suspect.relationshipToVictim,
        suspectStatement: suspect.statement,
        victimName: mystery.victim.name,
        evidenceTitle: evidence.title,
        evidenceDescription: evidence.description,
        posture,
        beat,
      });
      // On a trip, fall back to the authored beat rather than showing an
      // error — which also covers the model being unreachable.
      reply =
        scrubInterrogation(generated, solution.murderer, solution.murdererAliases) ??
        beat;
    } catch {
      reply = beat;
    }

    const cracked = Boolean(state.crackedASuspect) || posture === "crack";
    await supabase
      .from("game_sessions")
      .update({
        state: {
          ...state,
          confrontationsUsed: usedCount + 1,
          crackedASuspect: cracked,
        },
        last_saved_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    logAiInteraction(
      `${teamId}_${mysteryId}`,
      "detective_chat",
      `Confronted ${suspect.name} with ${evidence.title}`,
      reply
    );

    return NextResponse.json({
      reply,
      suspectId,
      evidenceId,
      remaining: CONFRONTATIONS_PER_CASE - (usedCount + 1),
    });
  } catch (err) {
    console.error("interrogate error:", err);
    return NextResponse.json(
      { error: "They could not be reached for questioning." },
      { status: 500 }
    );
  }
}
