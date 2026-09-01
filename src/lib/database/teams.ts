import { createAdminClient } from "@/lib/supabase/server-admin";
import { getEventIdByCode } from "@/lib/database/events";
import type { Team } from "@/types";

export async function registerTeam(
  name: string,
  pin: string,
  eventCode: string
): Promise<Team> {
  const supabase = createAdminClient();

  const eventId = await getEventIdByCode(supabase, eventCode);
  if (!eventId) {
    throw new Error("Event not found");
  }

  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", eventId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    throw new Error("Team name already taken in this event");
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      event_id: eventId,
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

  const eventId = await getEventIdByCode(supabase, eventCode);
  if (!eventId) {
    throw new Error("Event not found");
  }

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, eventId:event_id, name, pin, createdAt:created_at, lastActiveAt:last_active_at")
    .eq("event_id", eventId)
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

  return { team, eventId };
}

export async function checkTeamNameAvailable(
  name: string,
  eventCode: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const eventId = await getEventIdByCode(supabase, eventCode);
  if (!eventId) return false;

  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("event_id", eventId)
    .eq("name", name)
    .maybeSingle();

  return !existing;
}
