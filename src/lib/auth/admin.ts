import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;
const COOKIE_NAME = "mm_admin_token";

export function createAdminCookieValue(passcode: string): string {
  const timestamp = Date.now().toString();
  const payload = `${passcode}:${timestamp}`;
  return Buffer.from(payload).toString("base64");
}

export function verifyAdminCookie(cookieValue: string): boolean {
  if (!ADMIN_PASSCODE) return false;
  try {
    const decoded = Buffer.from(cookieValue, "base64").toString("utf-8");
    const [passcode, timestamp] = decoded.split(":");
    if (passcode !== ADMIN_PASSCODE) return false;
    const age = Date.now() - parseInt(timestamp);
    return age < 2 * 60 * 60 * 1000;
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

  const authHeader = request.headers.get("x-admin-passcode");
  if (authHeader === ADMIN_PASSCODE) {
    return null;
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value && verifyAdminCookie(cookie.value)) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

export { COOKIE_NAME };
