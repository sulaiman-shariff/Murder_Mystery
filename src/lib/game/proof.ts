import type { ProofGrade } from "@/types";

interface ProofSpec {
  required: string[];
  supporting: string[];
  maxSelections: number;
}

/**
 * Grades a submitted set of clues: complete-and-clean.
 *
 * Not exact-match — with eight clues and a four-clue answer that is seventy
 * blind combinations and no partial signal. Not subset either, or selecting
 * everything wins. Instead:
 *
 *  - every required clue must be present, which is what makes the mechanic
 *    mean anything;
 *  - a hard cap of required + 2 kills select-all;
 *  - one stray pick is forgiven, because nobody should lose an attempt over a
 *    single extra hunch, but two is a shotgun.
 *
 * The caller returns counts to the player, never identities: "you are one
 * short" is a nudge, "you are missing the key register" is the answer.
 */
export function gradeProof(submitted: string[], spec: ProofSpec): ProofGrade {
  const chosen = new Set(submitted);
  const allowed = new Set([...spec.required, ...spec.supporting]);

  const missingCount = spec.required.filter((id) => !chosen.has(id)).length;
  const noiseCount = submitted.filter((id) => !allowed.has(id)).length;

  const base = {
    missingCount,
    noiseCount,
    required: spec.required.length,
    maxSelections: spec.maxSelections,
  };

  if (submitted.length > spec.maxSelections) {
    return { ...base, verdict: "over-cap" };
  }
  if (missingCount > 0) {
    return { ...base, verdict: "incomplete" };
  }
  if (noiseCount >= 2) {
    return { ...base, verdict: "unfocused" };
  }
  return { ...base, verdict: "proven" };
}

/** Player-facing wording. Deliberately says how many, never which. */
export function describeProof(grade: ProofGrade): string {
  switch (grade.verdict) {
    case "proven":
      return "The case holds together.";
    case "over-cap":
      return `Narrow it down — name at most ${grade.maxSelections} pieces of evidence.`;
    case "incomplete":
      return grade.missingCount === 1
        ? "Close. There is one more thing you need before this proves anything."
        : `Not yet — ${grade.missingCount} of the things that would prove this are missing.`;
    case "unfocused":
      return "You have what you need in there, but too much that proves nothing alongside it. Cut it back.";
  }
}
