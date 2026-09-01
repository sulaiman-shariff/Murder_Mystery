import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllMysteries } from "@/data/mystery-index";
import { getSolutionById, getHintPlanById } from "@/data/solutions";
import { getDeduction } from "@/data/deduction";

/**
 * The answer key, for the operator.
 *
 * When a team asks "does this count?" mid-event you need the solution, what
 * proves it, which alibis can be broken and what each suspect will admit —
 * without digging through source files on a laptop.
 *
 * ADMIN ONLY, and it must stay that way: this is the content the entire
 * server-only spoiler architecture exists to keep away from players.
 */
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const cases = getAllMysteries().map((mystery) => {
    const solution = getSolutionById(mystery.id);
    const deduction = getDeduction(mystery.id);
    const nameOf = (id: string) =>
      mystery.suspects.find((s) => s.id === id)?.name ?? id;
    const titleOf = (id: string) =>
      mystery.evidence.find((e) => e.id === id)?.title ?? id;

    return {
      id: mystery.id,
      order: mystery.order,
      title: mystery.title,
      victim: mystery.victim.name,
      suspects: mystery.suspects.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        alibi: s.alibi?.claim ?? null,
      })),
      solution: solution
        ? {
            murderer: solution.murderer,
            alsoAccepted: solution.murdererAliases,
            motive: solution.motiveSummary,
            motiveMustConvey: solution.motiveRequiredConcepts,
            alsoAcceptedMotives: solution.acceptableMotiveInterpretations,
            rejectedMotives: solution.commonIncorrectMotiveInterpretations,
            explanation: solution.explanation,
            provedBy: solution.decisiveEvidenceIds.map(titleOf),
          }
        : null,
      proof: deduction
        ? {
            required: deduction.proof.required.map(titleOf),
            alsoAllowed: deduction.proof.supporting.map(titleOf),
            maxSelections: deduction.proof.maxSelections,
          }
        : null,
      alibiBreaks: (deduction?.alibiBreaks ?? []).map((b) => ({
        suspect: nameOf(b.suspectId),
        needs: b.evidenceIds.map(titleOf),
        consequence: b.consequence,
        reveal: b.reveal,
      })),
      confrontations: (deduction?.confrontations ?? []).map((c) => ({
        suspect: nameOf(c.suspectId),
        shown: titleOf(c.evidenceId),
        posture: c.posture,
        admits: c.beat,
      })),
      hints: getHintPlanById(mystery.id).map((h) => ({
        level: h.level,
        points: h.relevantEvidenceIds.map(titleOf),
        says: h.maximumRevelation,
      })),
    };
  });

  return NextResponse.json(
    { cases },
    { headers: { "Cache-Control": "no-store" } }
  );
}
