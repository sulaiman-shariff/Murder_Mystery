import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireTeam } from "@/lib/auth/team-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById } from "@/data/mystery-index";
import { getConfrontation } from "@/data/deduction";
import { getSolutionById } from "@/data/solutions";
import { interrogate, scrubInterrogation } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/database/ai-log";
import { loadSession, updateSessionState } from "@/lib/database/session-store";

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
      return NextResponse.json(
        { error: "Unknown suspect or evidence" },
        { status: 404 },
      );
    }

    const supabase = createAdminClient();
    const session = await loadSession(supabase, teamId, mysteryId);

    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    if (session.state.server.confrontationsUsed >= CONFRONTATIONS_PER_CASE) {
      return NextResponse.json({
        exhausted: true,
        remaining: 0,
        reply:
          "They have stopped answering you. You will have to work with what you already have.",
      });
    }

    // Claim the slot BEFORE the model call. The check used to sit across the
    // await, so a burst of parallel requests all passed it and the budget was
    // never really six.
    let usedCount = session.state.server.confrontationsUsed;
    let overBudget = false;
    try {
      await updateSessionState(supabase, session, (current) => {
        if (current.server.confrontationsUsed >= CONFRONTATIONS_PER_CASE) {
          overBudget = true;
          return current;
        }
        usedCount = current.server.confrontationsUsed;
        return {
          ...current,
          server: {
            ...current.server,
            confrontationsUsed: current.server.confrontationsUsed + 1,
          },
        };
      });
    } catch {
      return NextResponse.json({
        exhausted: false,
        remaining: CONFRONTATIONS_PER_CASE - usedCount,
        reply: "Ask again in a moment — someone else is mid-question.",
      });
    }

    if (overBudget) {
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
        scrubInterrogation(
          generated,
          solution.murderer,
          solution.murdererAliases,
        ) ?? beat;
    } catch {
      reply = beat;
    }

    if (posture === "crack") {
      const latest = await loadSession(supabase, teamId, mysteryId);
      if (latest) {
        await updateSessionState(supabase, latest, (current) => ({
          ...current,
          server: { ...current.server, crackedASuspect: true },
        }));
      }
    }

    logAiInteraction(
      `${teamId}_${mysteryId}`,
      "interrogation",
      `Confronted ${suspect.name} with ${evidence.title}`,
      reply,
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
      { status: 500 },
    );
  }
}
