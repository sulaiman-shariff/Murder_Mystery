import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, eventCode:event_code, status, createdAt:created_at, scoringSettings:scoring_settings, currentMysteryLimit:current_mystery_limit, maxAttempts:max_attempts")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: events || [] });
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { eventCode, name, status, scoringSettings, maxAttempts, currentMysteryLimit } = body;

  const supabase = createAdminClient();

  if (eventCode) {
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (scoringSettings !== undefined) updates.scoring_settings = scoringSettings;
    if (maxAttempts !== undefined) updates.max_attempts = maxAttempts;
    if (currentMysteryLimit !== undefined) updates.current_mystery_limit = currentMysteryLimit;

    const { data: updated, error } = await supabase
      .from("events")
      .update(updates)
      .eq("event_code", eventCode)
      .select("id, name, eventCode:event_code, status, createdAt:created_at, scoringSettings:scoring_settings, currentMysteryLimit:current_mystery_limit, maxAttempts:max_attempts")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ event: updated });
  }

  const newCode = `EVENT-${Date.now().toString(36).toUpperCase()}`;
  const { data: created, error } = await supabase
    .from("events")
    .insert({
      name: name || "New Event",
      event_code: newCode,
      status: "draft",
      scoring_settings: scoringSettings || undefined,
      max_attempts: maxAttempts || 10,
      current_mystery_limit: currentMysteryLimit || 3,
    })
    .select("id, name, eventCode:event_code, status, createdAt:created_at, scoringSettings:scoring_settings, currentMysteryLimit:current_mystery_limit, maxAttempts:max_attempts")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event: created });
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
