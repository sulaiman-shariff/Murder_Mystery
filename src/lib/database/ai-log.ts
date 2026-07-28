import { createClient } from "@/lib/supabase/server";
import type { AiInteractionType } from "@/types";

export async function logAiInteraction(
  sessionId: string | undefined,
  type: AiInteractionType,
  playerInput: string,
  aiOutput: string
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("ai_interactions").insert({
      session_id: sessionId || null,
      type,
      player_input: playerInput,
      ai_output: aiOutput,
    });
  } catch {
    // non-blocking
  }
}
