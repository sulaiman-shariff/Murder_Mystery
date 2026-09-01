import { NextRequest, NextResponse } from "next/server";
import { getAllMysteries } from "@/data/mystery-index";
import { getSolutionById, getHintPlanById } from "@/data/solutions";
import { requireAdmin } from "@/lib/auth/admin";
import type { Mystery } from "@/types";

/**
 * The content linter.
 *
 * Runs server-side, so it may legally import the server-only solutions module
 * and compare the answer key against the public case files. Its most important
 * job is turning "did we leak the killer?" from a review question into a
 * failing check: no clue, timeline entry or story section may contain the
 * murderer's name.
 *
 * Open in development; admin-only in production.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authError = requireAdmin(request);
    if (authError) return authError;
  }

  const problems: string[] = [];
  const report: Record<string, unknown>[] = [];

  for (const mystery of getAllMysteries()) {
    const fail = (message: string) => problems.push(`[${mystery.id}] ${message}`);

    const evidenceIds = new Set(mystery.evidence.map((e) => e.id));
    const suspectIds = new Set(mystery.suspects.map((s) => s.id));
    const placeIds = new Set((mystery.places ?? []).map((p) => p.id));
    const solution = getSolutionById(mystery.id);

    if (!solution) {
      fail("no solution authored");
      continue;
    }

    // 1. The leak check. Every word a player can read, against the killer's name.
    const nameTokens = solution.murderer
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2);

    const playerVisible: { where: string; text: string }[] = [
      ...mystery.evidence.map((e) => ({
        where: `evidence "${e.id}"`,
        text: `${e.title} ${e.description}`,
      })),
      ...(mystery.timeline ?? []).map((t) => ({
        where: `timeline "${t.id}"`,
        text: t.event,
      })),
      ...mystery.storySections.map((s) => ({
        where: `story "${s.id}"`,
        text: s.content,
      })),
      { where: "introduction", text: mystery.introduction },
      { where: "victim", text: mystery.victim.description },
    ];

    for (const { where, text } of playerVisible) {
      const hit = nameTokens.find((token) =>
        new RegExp(`\\b${token}\\b`, "i").test(text)
      );
      if (hit) fail(`${where} names the murderer ("${hit}")`);
    }

    // 2. Referential integrity of the answer key.
    for (const id of solution.decisiveEvidenceIds) {
      if (!evidenceIds.has(id)) fail(`decisive evidence "${id}" does not exist`);
    }
    for (const level of getHintPlanById(mystery.id)) {
      for (const id of level.relevantEvidenceIds) {
        if (!evidenceIds.has(id)) {
          fail(`hint level ${level.level} cites missing evidence "${id}"`);
        }
      }
    }
    if (!mystery.suspects.some((s) => s.name === solution.murderer)) {
      fail(`murderer "${solution.murderer}" is not one of the suspects`);
    }

    // 3. The statistical leak. Tag counts must not fingerprint anyone.
    const tagCounts: Record<string, number> = {};
    for (const id of suspectIds) tagCounts[id] = 0;
    for (const item of mystery.evidence) {
      for (const id of item.mentionsSuspectIds) {
        if (!suspectIds.has(id)) {
          fail(`evidence "${item.id}" mentions unknown suspect "${id}"`);
          continue;
        }
        tagCounts[id] += 1;
      }
    }
    const counts = Object.values(tagCounts);
    const spread = Math.max(...counts) - Math.min(...counts);
    if (spread > 1) fail(`clue-tag spread is ${spread} (must be <= 1): ${JSON.stringify(tagCounts)}`);
    if (Math.min(...counts) < 1) fail(`a suspect has no clues attached: ${JSON.stringify(tagCounts)}`);

    const murdererId = mystery.suspects.find((s) => s.name === solution.murderer)?.id;
    if (murdererId && tagCounts[murdererId] === Math.max(...counts)) {
      const tied = counts.filter((c) => c === Math.max(...counts)).length;
      if (tied === 1) fail("the murderer is the uniquely most-tagged suspect");
    }

    // 4. The case clock.
    const timeline = mystery.timeline ?? [];
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].t <= timeline[i - 1].t) {
        fail(`timeline is not in ascending case-clock order at "${timeline[i].id}"`);
      }
    }
    for (const entry of timeline) {
      if (entry.placeId && !placeIds.has(entry.placeId)) {
        fail(`timeline "${entry.id}" references unknown place "${entry.placeId}"`);
      }
      if (entry.relatedSuspectId && !suspectIds.has(entry.relatedSuspectId)) {
        fail(`timeline "${entry.id}" references unknown suspect`);
      }
    }

    // 5. Alibis must be checkable.
    for (const suspect of mystery.suspects) {
      if (!suspect.alibi) continue;
      const { placeId, from, to } = suspect.alibi;
      if (!placeIds.has(placeId)) {
        fail(`${suspect.id}'s alibi references unknown place "${placeId}"`);
      }
      if (from >= to) fail(`${suspect.id}'s alibi window is empty or inverted`);
    }

    report.push({
      id: mystery.id,
      title: mystery.title,
      suspects: mystery.suspects.length,
      evidence: mystery.evidence.length,
      timeline: timeline.length,
      decisive: solution.decisiveEvidenceIds.length,
      tagCounts,
    });
  }

  return NextResponse.json(
    { ok: problems.length === 0, problems, cases: report },
    { status: problems.length === 0 ? 200 : 500 }
  );
}
