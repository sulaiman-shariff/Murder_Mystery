import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;
const COOKIE_NAME = "mm_admin_token";

export const SESSION_TTL_SECONDS = 2 * 60 * 60;

/**
 * Admin sessions are a signed expiry, not the passcode itself.
 *
 * The cookie reads `<expiryEpochMs>.<hmac>`, where the HMAC is keyed by
 * ADMIN_PASSCODE. That means the passcode never travels to the browser, and
 * the expiry cannot be extended by hand without also forging the signature.
 */
function sign(expiry: string): string {
  return createHmac("sha256", ADMIN_PASSCODE!).update(expiry).digest("hex");
}

/** Constant-time string compare that tolerates unequal lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isValidPasscode(candidate: unknown): boolean {
  if (!ADMIN_PASSCODE || typeof candidate !== "string") return false;
  return safeEqual(candidate, ADMIN_PASSCODE);
}

export function createAdminCookieValue(): string {
  const expiry = (Date.now() + SESSION_TTL_SECONDS * 1000).toString();
  return `${expiry}.${sign(expiry)}`;
}

export function verifyAdminCookie(cookieValue: string): boolean {
  if (!ADMIN_PASSCODE) return false;

  const [expiry, signature] = cookieValue.split(".");
  if (!expiry || !signature) return false;

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  try {
    return safeEqual(signature, sign(expiry));
  } catch {
    return false;
  }
}

export function requireAdmin(request: NextRequest): NextResponse | null {
  if (!ADMIN_PASSCODE) {
    return NextResponse.json(
      { error: "Admin authentication not configured" },
      { status: 500 }
    );
  }

  if (isValidPasscode(request.headers.get("x-admin-passcode"))) {
    return null;
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value && verifyAdminCookie(cookie.value)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export { COOKIE_NAME };
