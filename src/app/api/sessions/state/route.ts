import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireTeam } from "@/lib/auth/team-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMysteryById } from "@/data/mystery-index";
import { loadSession, updateSessionState } from "@/lib/database/session-store";
import { applyOps, validateOps } from "@/lib/game/session-state";

/** The merged document, not the request body — merging unbounds the request. */
const MAX_STATE_BYTES = 64_000;

/** Polls are frequent by design and get their own, larger budget. */
const POLL_LIMIT = 60;

/**
 * The poll. Other devices on the same team call this to pick up each other's
 * notes, marked evidence and board pins.
 *
 * Deliberately does NOT write last_saved_at: the admin live monitor reads that
 * column as "someone did something", and a polling write would make every team
 * look permanently active and silently kill stuck detection.
 */
export async function GET(request: NextRequest) {
  const actor = requireTeam(request);
  if (actor instanceof NextResponse) return actor;

  const limitCheck = checkRateLimit(`state-poll:${actor.teamId}`, {
    max: POLL_LIMIT,
  });
  if (limitCheck) return limitCheck;

  const mysteryId = request.nextUrl.searchParams.get("mysteryId");
  if (!mysteryId || !getMysteryById(mysteryId)) {
    return NextResponse.json({ error: "Unknown mystery" }, { status: 400 });
  }

  const since = Number(request.nextUrl.searchParams.get("since") ?? "-1");

  const supabase = createAdminClient();
  const session = await loadSession(supabase, actor.teamId, mysteryId);
  if (!session) {
    return NextResponse.json({ error: "No active session" }, { status: 404 });
  }

  // Nothing new: keep the common response tiny.
  if (Number.isFinite(since) && session.rev === since) {
    return NextResponse.json(
      { revision: session.rev, changed: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      revision: session.rev,
      changed: true,
      state: session.state,
      startedAt: session.startedAt,
      status: session.status,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Applies this device's changes as ops.
 *
 * Ops, not a document: a whole-document save cannot express a removal
 * distinctly from a stale copy, and it let a client overwrite the four
 * server-owned keys — which a team could use deliberately to refund the alibi
 * and interrogation budgets. An op can only name a client-owned field, and
 * anything else is a 400 rather than a silent drop.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mysteryId, ops, deviceId } = body;

    const actor = requireTeam(request, body.teamId);
    if (actor instanceof NextResponse) return actor;
    const teamId = actor.teamId;

    const limitCheck = checkRateLimit(`state:${teamId}`, { max: 40 });
    if (limitCheck) return limitCheck;

    const mystery = mysteryId ? getMysteryById(mysteryId) : undefined;
    if (!mystery) {
      return NextResponse.json({ error: "Unknown mystery" }, { status: 400 });
    }

    // An older client posting a whole `state` blob: refuse rather than try to
    // convert it, because a snapshot cannot express removals and would either
    // clobber other devices or silently drop unstars.
    if (ops === undefined && body.state !== undefined) {
      return NextResponse.json(
        {
          code: "CLIENT_OUTDATED",
          error: "Please refresh this page to keep saving.",
        },
        { status: 409 }
      );
    }

    const validated = validateOps(
      ops,
      new Set(mystery.suspects.map((s) => s.id)),
      new Set(mystery.evidence.map((e) => e.id))
    );
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const supabase = createAdminClient();
    const session = await loadSession(supabase, teamId, mysteryId);
    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    const result = await updateSessionState(
      supabase,
      session,
      (stored, revision) =>
        applyOps(
          stored,
          validated.ops,
          revision,
          typeof deviceId === "string" ? deviceId.slice(0, 24) : undefined
        )
    );

    if (JSON.stringify(result.state).length > MAX_STATE_BYTES) {
      return NextResponse.json(
        { error: "That is more state than a case should need." },
        { status: 413 }
      );
    }

    return NextResponse.json(
      {
        revision: result.rev,
        applied: validated.ops.length,
        state: result.state,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Session state error:", err);
    return NextResponse.json(
      { error: "Could not save your progress." },
      { status: 500 }
    );
  }
}
