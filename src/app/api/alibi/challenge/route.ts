import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireTeam } from "@/lib/auth/team-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById } from "@/data/mystery-index";
import { getAlibiBreak } from "@/data/deduction";
import { loadSession, updateSessionState } from "@/lib/database/session-store";

const CHALLENGES_PER_SUSPECT = 2;

/**
 * Challenge a suspect's alibi with evidence.
 *
 * This is the only endpoint in the game that returns a correctness boolean,
 * which makes it an oracle a team could grind. Two things keep it honest:
 *
 *  1. A budget of two attempts per suspect, counted server-side.
 *  2. A suspect with no authored break returns a response BYTE-IDENTICAL to a
 *     wrong guess. Otherwise "which suspects error differently" is itself the
 *     answer key.
 *
 * A failed challenge costs no attempt — an optional tool must not punish
 * curiosity — but it does burn budget.
 */
const NEUTRAL_FAILURE = "That does not contradict what they told you.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mysteryId, suspectId, evidenceIds } = body;

    const actor = requireTeam(request, body.teamId);
    if (actor instanceof NextResponse) return actor;
    const teamId = actor.teamId;

    const limitCheck = checkRateLimit(`alibi:${teamId}`);
    if (limitCheck) return limitCheck;

    const mystery = getMysteryById(mysteryId);
    if (!mystery) {
      return NextResponse.json({ error: "Mystery not found" }, { status: 404 });
    }
    const suspect = mystery.suspects.find((s) => s.id === suspectId);
    if (!suspect) {
      return NextResponse.json({ error: "No such suspect" }, { status: 404 });
    }

    const submitted: string[] = Array.isArray(evidenceIds)
      ? evidenceIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    const supabase = createAdminClient();
    const session = await loadSession(supabase, teamId, mysteryId);

    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    const state = session.state;
    const used = state.server.challengesBySuspect;
    const broken = state.server.alibisBroken;

    if (broken.includes(suspectId)) {
      return NextResponse.json({
        broken: true,
        alreadyBroken: true,
        consequence: "weakens",
        reveal: "You have already broken this one.",
      });
    }

    if ((used[suspectId] ?? 0) >= CHALLENGES_PER_SUSPECT) {
      return NextResponse.json({
        broken: false,
        exhausted: true,
        message: "You have pressed this one as far as it will go.",
      });
    }

    const authored = getAlibiBreak(mysteryId, suspectId);
    const correct =
      !!authored &&
      authored.evidenceIds.every((id) => submitted.includes(id)) &&
      submitted.length <= authored.evidenceIds.length + 1;

    // The budget must be re-checked INSIDE the mutation. Checking it before
    // the compare-and-swap reads a stale count, so a burst of simultaneous
    // challenges all passed the check and every one of them incremented.
    let remaining = 0;
    let overBudget = false;
    try {
      await updateSessionState(supabase, session, (current) => {
        const already = current.server.challengesBySuspect[suspectId] ?? 0;
        if (already >= CHALLENGES_PER_SUSPECT) {
          overBudget = true;
          return current;
        }
        const spent = already + 1;
        remaining = Math.max(0, CHALLENGES_PER_SUSPECT - spent);
        return {
          ...current,
          server: {
            ...current.server,
            challengesBySuspect: {
              ...current.server.challengesBySuspect,
              [suspectId]: spent,
            },
            alibisBroken:
              correct && !current.server.alibisBroken.includes(suspectId)
                ? [...current.server.alibisBroken, suspectId]
                : current.server.alibisBroken,
          },
        };
      });
    } catch {
      // Lost every retry against other devices; refuse rather than 500.
      return NextResponse.json({
        broken: false,
        message: "Too many at once — try that again.",
      });
    }

    if (overBudget) {
      return NextResponse.json({
        broken: false,
        exhausted: true,
        message: "You have pressed this one as far as it will go.",
      });
    }

    if (!correct) {
      // Identical for "wrong evidence" and "this alibi cannot be broken".
      return NextResponse.json({
        broken: false,
        message: NEUTRAL_FAILURE,
        remaining,
      });
    }

    return NextResponse.json({
      broken: true,
      consequence: authored!.consequence,
      reveal: authored!.reveal,
    });
  } catch (err) {
    console.error("alibi challenge error:", err);
    return NextResponse.json(
      { error: "That challenge could not be checked." },
      { status: 500 }
    );
  }
}
