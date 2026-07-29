import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { teamId, newPin } = body;

  if (!teamId || !newPin) {
    return NextResponse.json({ error: "teamId and newPin are required" }, { status: 400 });
  }

  if (typeof newPin !== "string" || newPin.length > 20) {
    return NextResponse.json({ error: "newPin must be 1-20 characters" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("teams")
    .update({ pin: newPin })
    .eq("id", teamId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
