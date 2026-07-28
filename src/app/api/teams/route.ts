import { NextRequest, NextResponse } from "next/server";
import { registerTeam, loginTeam } from "@/lib/database/teams";
import { createSession, getActiveSession } from "@/lib/database/sessions";
import { getMysteryByOrder } from "@/data/mystery-index";
import { checkRateLimit } from "@/lib/rate-limit";
import { cleanupStaleSessions } from "@/lib/database/cleanup";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const limitCheck = checkRateLimit(`teams:${ip}`);
    if (limitCheck) return limitCheck;

    const body = await request.json();
    const { name, pin, eventCode } = body;

    if (!name || !pin || !eventCode) {
      return NextResponse.json(
        { error: "Name, PIN, and event code are required" },
        { status: 400 }
      );
    }

    const isRegister = request.nextUrl.pathname.endsWith("/register");

    if (isRegister) {
      return handleRegister(name, pin, eventCode);
    }
    return handleLogin(name, pin, eventCode);
  } catch (err) {
    console.error("Teams API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleRegister(name: string, pin: string, eventCode: string) {
  const team = await registerTeam(name, pin, eventCode);

  const firstMystery = getMysteryByOrder(1);
  if (!firstMystery) {
    return NextResponse.json({ error: "No mysteries configured" }, { status: 500 });
  }

  const activeSession = await createSession(team.id, team.eventId, firstMystery.id);

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
    return NextResponse.json({ error: "No mysteries configured" }, { status: 500 });
  }

  const activeSession = await getActiveSession(team.id, eventId);

  return NextResponse.json({
    team,
    activeSession,
    nextMysteryId: activeSession?.mysteryId || firstMystery.id,
  });
}
