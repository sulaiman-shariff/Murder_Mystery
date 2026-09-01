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
 * Falls back to ADMIN_PASSCODE as the signing key when SESSION_SECRET is not
 * set, so an existing deployment keeps working without a new env var.
 */
function secret(): string | undefined {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSCODE;
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
