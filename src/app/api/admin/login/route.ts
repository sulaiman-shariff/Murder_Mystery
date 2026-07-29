import { NextRequest, NextResponse } from "next/server";
import { createAdminCookieValue, COOKIE_NAME } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;

  if (!ADMIN_PASSCODE) {
    return NextResponse.json(
      { error: "Admin authentication not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { passcode } = body;

  if (passcode !== ADMIN_PASSCODE) {
    return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
  }

  const cookieValue = createAdminCookieValue(passcode);
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60,
  });

  return response;
}
