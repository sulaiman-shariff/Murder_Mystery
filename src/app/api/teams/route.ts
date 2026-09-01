import { NextRequest, NextResponse } from "next/server";
import { registerTeam, loginTeam } from "@/lib/database/teams";
import { createSession, getActiveSession } from "@/lib/database/sessions";
import { getMysteryByOrder } from "@/data/mystery-index";
import { checkRateLimit } from "@/lib/rate-limit";
import { cleanupStaleSessions } from "@/lib/database/cleanup";

/**
 * Expected failures and the status they should carry. Anything not listed
 * here is a genuine fault and becomes a 500.
 */
const KNOWN_ERRORS: { match: string; status: number; message: string }[] = [
  {
    match: "Invalid team name or PIN",
    status: 401,
    message: "No team with that name and PIN in this event.",
  },
  {
    match: "Team name already taken",
    status: 409,
    message: "Another team already registered that name. Pick a different one.",
  },
  {
    match: "Event not found",
    status: 404,
    message: "That event code does not match an event. Check it and try again.",
  },
];

function errorResponse(err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  const known = KNOWN_ERRORS.find((candidate) => raw.includes(candidate.match));

  if (known) {
    return NextResponse.json(
      { error: known.message },
      { status: known.status }
    );
  }

  console.error("Teams API error:", err);
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again." },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const limitCheck = checkRateLimit(`teams:${ip}`);
    if (limitCheck) return limitCheck;

    let body: { name?: string; pin?: string; eventCode?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { name, pin, eventCode } = body;

    if (!name || !pin || !eventCode) {
      return NextResponse.json(
        { error: "Name, PIN, and event code are required" },
        { status: 400 }
      );
    }

    const isRegister = request.nextUrl.pathname.endsWith("/register");

    // These must be awaited, not just returned: a returned promise rejects
    // after this try block has already exited, so the failure escaped the
    // catch and Next answered with a bare 500 and an empty body. The client
    // then died on res.json() with "Unexpected end of JSON input" instead of
    // showing "wrong PIN" or "name already taken".
    return isRegister
      ? await handleRegister(name, pin, eventCode)
      : await handleLogin(name, pin, eventCode);
  } catch (err) {
    return errorResponse(err);
  }
}

async function handleRegister(name: string, pin: string, eventCode: string) {
  const team = await registerTeam(name, pin, eventCode);

  const firstMystery = getMysteryByOrder(1);
  if (!firstMystery) {
    return NextResponse.json(
      { error: "No mysteries configured" },
      { status: 500 }
    );
  }

  const activeSession = await createSession(
    team.id,
    team.eventId,
    firstMystery.id
  );

  return NextResponse.json({
    team,
    session: activeSession,
    nextMysteryId: firstMystery.id,
  });
}

async function handleLogin(name: string, pin: string, eventCode: string) {
  const { team, eventId } = await loginTeam(name, pin, eventCode);

  cleanupStaleSessions(team.id);

  const firstMystery = getMysteryByOrder(1);
  if (!firstMystery) {
    return NextResponse.json(
      { error: "No mysteries configured" },
      { status: 500 }
    );
  }

  const activeSession = await getActiveSession(team.id, eventId);

  return NextResponse.json({
    team,
    activeSession,
    nextMysteryId: activeSession?.mysteryId || firstMystery.id,
  });
}
