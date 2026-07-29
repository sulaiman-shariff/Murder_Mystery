import { createAdminClient } from "@/lib/supabase/server-admin";
import type { Team } from "@/types";

export async function registerTeam(
  name: string,
  pin: string,
  eventCode: string
): Promise<Team> {
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("event_code", eventCode)
    .single();

  if (!event) {
    throw new Error("Event not found");
  }

  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", event.id)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    throw new Error("Team name already taken in this event");
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      event_id: event.id,
      name,
      pin,
    })
    .select("id, eventId:event_id, name, pin, createdAt:created_at, lastActiveAt:last_active_at")
    .single();

  if (error) throw error;
  return team;
}

export async function loginTeam(
  name: string,
  pin: string,
  eventCode: string
): Promise<{ team: Team; eventId: string }> {
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("event_code", eventCode)
    .single();

  if (!event) {
    throw new Error("Event not found");
  }

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, eventId:event_id, name, pin, createdAt:created_at, lastActiveAt:last_active_at")
    .eq("event_id", event.id)
    .eq("name", name)
    .eq("pin", pin)
    .single();

  if (error || !team) {
    throw new Error("Invalid team name or PIN");
  }

  await supabase
    .from("teams")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", team.id);

  return { team, eventId: event.id };
}

export async function checkTeamNameAvailable(
  name: string,
  eventCode: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("event_code", eventCode)
    .single();

  if (!event) return false;

  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", event.id)
    .eq("name", name)
    .maybeSingle();

  return !existing;
}
