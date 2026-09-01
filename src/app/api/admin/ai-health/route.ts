import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { requireAdmin } from "@/lib/auth/admin";
import { checkAiReadiness } from "@/lib/ai/readiness";

const WINDOW_MINUTES = 15;

/**
 * Whether the AI is actually working, and how often it has been falling back.
 * When the model broke earlier in this project the only symptom was players
 * complaining that validation "wasn't working".
 */
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const force = request.nextUrl.searchParams.get("force") === "1";
  const gemini = await checkAiReadiness(force);

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const supabase = createAdminClient();
  const { data: recent } = await supabase
    .from("ai_interactions")
    .select("type, outcome")
    .gte("created_at", since)
    .limit(500);

  const rows = recent ?? [];
  const byType: Record<string, number> = {};
  let fallback = 0;
  let unavailable = 0;
  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1;
    if (row.outcome === "fallback") fallback++;
    if (row.outcome === "unavailable") unavailable++;
  }

  return NextResponse.json(
    {
      gemini,
      recent: {
        windowMinutes: WINDOW_MINUTES,
        total: rows.length,
        byType,
        fallbackRate: rows.length ? fallback / rows.length : 0,
        unavailableCount: unavailable,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
