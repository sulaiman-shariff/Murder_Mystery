import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/database/admin-audit";

const SELECT =
  "id, name, eventCode:event_code, status, createdAt:created_at, scoringSettings:scoring_settings, currentMysteryLimit:current_mystery_limit, maxAttempts:max_attempts";

/**
 * Clones an event's settings into a new one. Copies no teams and no sessions —
 * "duplicate" reads ambiguously, so the UI says so explicitly.
 */
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { sourceEventId, name, eventCode } = await request.json().catch(() => ({}));

  const code =
    typeof eventCode === "string" ? eventCode.trim().toUpperCase() : "";
  if (!sourceEventId || !/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(code)) {
    return NextResponse.json(
      { error: "A source event and a valid new join code are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: source } = await supabase
    .from("events")
    .select("name, scoring_settings, max_attempts, current_mystery_limit")
    .eq("id", sourceEventId)
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: "Source event not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      name: (typeof name === "string" && name.trim()) || `${source.name} (copy)`,
      event_code: code,
      status: "draft",
      scoring_settings: source.scoring_settings,
      max_attempts: source.max_attempts,
      current_mystery_limit: source.current_mystery_limit,
    })
    .select(SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That join code is already in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not duplicate the event" }, { status: 500 });
  }

  logAdminAction(supabase, {
    action: "event.duplicate",
    eventId: data.id,
    detail: { from: sourceEventId, eventCode: code },
  });
  return NextResponse.json({ event: data }, { status: 201 });
}
