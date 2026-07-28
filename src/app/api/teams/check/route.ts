import { NextRequest, NextResponse } from "next/server";
import { checkTeamNameAvailable } from "@/lib/database/teams";

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name");
    const eventCode = request.nextUrl.searchParams.get("eventCode");

    if (!name || !eventCode) {
      return NextResponse.json(
        { error: "name and eventCode are required" },
        { status: 400 }
      );
    }

    const available = await checkTeamNameAvailable(name, eventCode);
    return NextResponse.json({ available });
  } catch (err) {
    console.error("Team check error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
