import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;

export function requireAdmin(request: NextRequest): NextResponse | null {
  if (!ADMIN_PASSCODE) {
    return NextResponse.json(
      { error: "Admin authentication not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("x-admin-passcode");
  if (authHeader !== ADMIN_PASSCODE) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}
