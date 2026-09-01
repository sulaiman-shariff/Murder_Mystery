import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "mm_team_session";
const TTL_SECONDS = 12 * 60 * 60;

/**
 * Signed team sessions.
 *
 * Modelled on src/lib/auth/admin.ts — an HMAC over the payload, keyed by a
 * server secret, no new dependency. Before this existed, every write route
 * took the team's identity from the request body, so anyone who knew a teamId
 * could overwrite that team's game state or post scores as them.
 *
 * SESSION_SECRET must be its own value. It falls back to ADMIN_PASSCODE only so
 * a deployment missing the variable still authenticates, but that coupling is
 * a trap: rotating the admin passcode would then invalidate every team's
 * cookie and sign the whole room out mid-event.
 */
let warned = false;

function secret(): string | undefined {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!warned) {
    warned = true;
    console.warn(
      "SESSION_SECRET is not set; falling back to ADMIN_PASSCODE. Changing the passcode will sign out every team."
    );
  }
  return process.env.ADMIN_PASSCODE;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()!).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface TeamSession {
  teamId: string;
  eventId: string;
}

export function createTeamCookieValue(session: TeamSession): string {
  const payload = `${session.teamId}.${session.eventId}.${
    Date.now() + TTL_SECONDS * 1000
  }`;
  return `${payload}.${sign(payload)}`;
}

export function verifyTeamCookie(value: string): TeamSession | null {
  if (!secret()) return null;

  const parts = value.split(".");
  if (parts.length !== 4) return null;

  const [teamId, eventId, expiry, signature] = parts;
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  try {
    if (!safeEqual(signature, sign(`${teamId}.${eventId}.${expiry}`))) return null;
  } catch {
    return null;
  }

  return { teamId, eventId };
}

export function setTeamCookie(response: NextResponse, session: TeamSession) {
  response.cookies.set(COOKIE_NAME, createTeamCookieValue(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

/**
 * Resolves the acting team from the signed cookie. The request body is never
 * trusted for identity.
 *
 * ALLOW_LEGACY_TEAM_ID exists so a release can go out without cutting off
 * players who are mid-session on an older client; it should be removed once
 * everyone has re-authenticated.
 */
export function requireTeam(
  request: NextRequest,
  bodyTeamId?: unknown
): TeamSession | NextResponse {
  const cookie = request.cookies.get(COOKIE_NAME);
  const session = cookie?.value ? verifyTeamCookie(cookie.value) : null;

  if (session) return session;

  if (process.env.ALLOW_LEGACY_TEAM_ID === "1" && typeof bodyTeamId === "string") {
    return { teamId: bodyTeamId, eventId: "" };
  }

  return NextResponse.json(
    { error: "Your session has expired. Please sign in again." },
    { status: 401 }
  );
}

export { COOKIE_NAME as TEAM_COOKIE_NAME };
