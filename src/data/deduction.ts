import "server-only";

import type { AlibiConsequence, ConfrontationPosture } from "@/types";

/**
 * The answer key for the deduction mechanics. Server-only, like solutions.ts.
 *
 * Design rules encoded here:
 *  - Proof is complete-and-clean: every required clue must be present, one
 *    stray pick is forgiven, and a hard cap kills select-all.
 *  - Every case authors at least one alibi break that lands on an INNOCENT.
 *    Without that, "break an alibi -> that's your killer" is a one-click solve.
 *  - Confrontations are authored per (suspect, evidence) pair. The model is
 *    given a posture and one sentence of true, non-spoiler content; it supplies
 *    voice, not facts. Every suspect uses the same template — if the murderer's
 *    differed, the tone difference would itself be the tell.
 */

interface ProofSpec {
  required: string[];
  /** Reasonable extras that cost nothing if included. */
  supporting: string[];
  maxSelections: number;
}

interface AlibiBreak {
  suspectId: string;
  evidenceIds: string[];
  consequence: AlibiConsequence;
  /** Shown only on a successful break. */
  reveal: string;
}

interface TrueLink {
  evidenceId: string;
  suspectIds: string[];
}

interface Confrontation {
  suspectId: string;
  evidenceId: string;
  posture: ConfrontationPosture;
  /** One sentence of new, true, non-spoiler information. */
  beat: string;
}

interface DeductionSecrets {
  proof: ProofSpec;
  alibiBreaks: AlibiBreak[];
  trueLinks: TrueLink[];
  confrontations: Confrontation[];
}

const DEDUCTION: Record<string, DeductionSecrets> = {
  "room-314": {
    proof: {
      required: ["door-log", "key-register", "pawn-ticket"],
      supporting: ["house-phone-log", "debt-ledger", "bar-tab"],
      maxSelections: 5,
    },
    alibiBreaks: [
      {
        suspectId: "dinah-coyle",
        evidenceIds: ["house-phone-log", "door-log"],
        consequence: "places-at-scene",
        reveal:
          "The desk she says she never left went unanswered from half past nine to five past ten, through a bell rung twice. That silence covers the minute a master card opened 314.",
      },
      {
        // The innocent break. Proves he lied; proves nothing else.
        suspectId: "hugo-vance",
        evidenceIds: ["house-phone-log"],
        consequence: "weakens",
        reveal:
          "The guest ringing down for ice at twenty to ten was on the third floor, and 318 is on the third floor. He was awake, which is not what he told you — but being awake is a long way from being in 314.",
      },
    ],
    trueLinks: [
      { evidenceId: "door-log", suspectIds: ["dinah-coyle", "marguerite-ash"] },
      { evidenceId: "key-register", suspectIds: ["dinah-coyle"] },
      { evidenceId: "pawn-ticket", suspectIds: ["dinah-coyle"] },
      { evidenceId: "house-phone-log", suspectIds: ["dinah-coyle"] },
      { evidenceId: "debt-ledger", suspectIds: ["piers-landon"] },
      { evidenceId: "bar-tab", suspectIds: ["piers-landon"] },
      { evidenceId: "the-paperweight", suspectIds: ["hugo-vance"] },
    ],
    confrontations: [
      {
        suspectId: "marguerite-ash",
        evidenceId: "key-register",
        posture: "concede",
        beat: "She signed her master card into the safe at ten past nine and did not take it out again that night.",
      },
      {
        suspectId: "marguerite-ash",
        evidenceId: "house-phone-log",
        posture: "deflect",
        beat: "The front desk is the porter's post, not hers, and she does not cover it.",
      },
      {
        suspectId: "marguerite-ash",
        evidenceId: "pawn-ticket",
        posture: "deny",
        beat: "She has never heard the name on the ticket and says the hotel does not keep staff records that far back.",
      },
      {
        suspectId: "piers-landon",
        evidenceId: "bar-tab",
        posture: "concede",
        beat: "He was in the bar from before nine until the barman turned him out, and the bar has one door.",
      },
      {
        suspectId: "piers-landon",
        evidenceId: "debt-ledger",
        posture: "deflect",
        beat: "He owed Sallow four hundred pounds and had been given until Christmas, which he thought was generous.",
      },
      {
        suspectId: "dinah-coyle",
        evidenceId: "key-register",
        posture: "deny",
        beat: "She says the register is often left unsigned at the end of a shift and that nobody has ever minded before.",
      },
      {
        suspectId: "dinah-coyle",
        evidenceId: "house-phone-log",
        posture: "crack",
        beat: "She says she stepped away to the linen room and did not hear the bell, and she does not say for how long.",
      },
      {
        suspectId: "dinah-coyle",
        evidenceId: "pawn-ticket",
        posture: "crack",
        beat: "She goes very still, and says only that a locket is a small thing to take off somebody.",
      },
      {
        suspectId: "hugo-vance",
        evidenceId: "the-paperweight",
        posture: "concede",
        beat: "He gave Sallow the paperweight on the eleventh anniversary of the business, and had it engraved himself.",
      },
      {
        suspectId: "hugo-vance",
        evidenceId: "debt-ledger",
        posture: "deflect",
        beat: "The ledger is the business's whole value, and he says he would rather have had Sallow alive to run it.",
      },
    ],
  },

  "vaughn-street": {
    proof: {
      required: ["iron-brace", "cue-sheet", "lighting-log", "next-season-list"],
      supporting: ["box-office-roll", "stage-door-book", "headset-channel"],
      maxSelections: 6,
    },
    alibiBreaks: [
      {
        suspectId: "tobias-frayne",
        evidenceIds: ["iron-brace", "cue-sheet"],
        consequence: "places-at-scene",
        reveal:
          "The brace carries Number Five greasepaint, so the man who swung it was made up. The cue sheet holds the only other made-up member of the company on stage for the whole of that scene. Nothing records where he was because nothing was ever asked to.",
      },
      {
        // The innocent break.
        suspectId: "rufus-bell",
        evidenceIds: ["next-season-list"],
        consequence: "weakens",
        reveal:
          "He was in the wings at the interval, putting the company list into Pike's hand — not at the returns window, where he places himself from the interval onward. The till roll accounts for him from ten past, but not before it.",
      },
    ],
    trueLinks: [
      { evidenceId: "iron-brace", suspectIds: ["tobias-frayne", "celia-wren"] },
      { evidenceId: "cue-sheet", suspectIds: ["celia-wren"] },
      { evidenceId: "lighting-log", suspectIds: ["marta-devlin"] },
      { evidenceId: "box-office-roll", suspectIds: ["rufus-bell"] },
      { evidenceId: "next-season-list", suspectIds: ["tobias-frayne"] },
      { evidenceId: "stage-door-book", suspectIds: ["tobias-frayne"] },
      { evidenceId: "headset-channel", suspectIds: ["tobias-frayne"] },
    ],
    confrontations: [
      {
        suspectId: "celia-wren",
        evidenceId: "cue-sheet",
        posture: "concede",
        beat: "She was on stage from the top of the act until the change at nine and never left it.",
      },
      {
        suspectId: "celia-wren",
        evidenceId: "iron-brace",
        posture: "deflect",
        beat: "Every man in the company wears the same Number Five, and so does she.",
      },
      {
        suspectId: "celia-wren",
        evidenceId: "next-season-list",
        posture: "deny",
        beat: "She had not seen the list and says Pike would never have shown it to a member of the cast.",
      },
      {
        suspectId: "tobias-frayne",
        evidenceId: "cue-sheet",
        posture: "deflect",
        beat: "He points out that understudies are not written into the cue sheet at all, and never have been.",
      },
      {
        suspectId: "tobias-frayne",
        evidenceId: "stage-door-book",
        posture: "concede",
        beat: "He signed in at the half and did not sign out until well after the curtain came down.",
      },
      {
        suspectId: "marta-devlin",
        evidenceId: "lighting-log",
        posture: "concede",
        beat: "She took every cue in the act by hand at the desk, four floors up behind a door that locks.",
      },
      {
        suspectId: "marta-devlin",
        evidenceId: "headset-channel",
        posture: "crack",
        beat: "The channel died at a quarter to nine and she carried on calling into it for a while before she understood nobody was there.",
      },
      {
        suspectId: "rufus-bell",
        evidenceId: "box-office-roll",
        posture: "concede",
        beat: "He sold eleven returns after the interval and the last of them is stamped four minutes before nine.",
      },
      {
        suspectId: "rufus-bell",
        evidenceId: "next-season-list",
        posture: "crack",
        beat: "He drew up the list himself and gave it to Pike at the interval, and says Pike told him it was a cruelty to leave it that late.",
      },
      {
        suspectId: "rufus-bell",
        evidenceId: "stage-door-book",
        posture: "deflect",
        beat: "He says the doorman is the only reliable witness in the building and that nobody got past him.",
      },
    ],
  },

  "northolt-press": {
    proof: {
      required: ["page-plan", "production-door", "advance-proofs", "final-note"],
      supporting: ["swipe-log", "printers-call", "the-spike"],
      maxSelections: 6,
    },
    alibiBreaks: [
      {
        suspectId: "vikram-rao",
        evidenceIds: ["production-door", "page-plan"],
        consequence: "places-at-scene",
        reveal:
          "He says he went straight out once the second edition was away. The page was remade at ten to one, and the production floor log has exactly one card on that floor across the whole of it — and no others at all.",
      },
      {
        // The innocent break.
        suspectId: "harriet-slade",
        evidenceIds: ["swipe-log"],
        consequence: "weakens",
        reveal:
          "She puts her leaving at about half past twelve. The visitor card goes out at 12:41. Eleven minutes is not much of a lie, but it is eleven minutes she has not accounted for.",
      },
    ],
    trueLinks: [
      { evidenceId: "page-plan", suspectIds: ["vikram-rao"] },
      { evidenceId: "production-door", suspectIds: ["vikram-rao"] },
      { evidenceId: "advance-proofs", suspectIds: ["vikram-rao"] },
      { evidenceId: "final-note", suspectIds: ["vikram-rao"] },
      { evidenceId: "swipe-log", suspectIds: ["douglas-kerr", "harriet-slade"] },
      { evidenceId: "printers-call", suspectIds: ["nell-farrow"] },
      { evidenceId: "the-spike", suspectIds: [] },
    ],
    confrontations: [
      {
        suspectId: "douglas-kerr",
        evidenceId: "swipe-log",
        posture: "concede",
        beat: "His card is the one that leaves at twenty to one, and he did not come back.",
      },
      {
        suspectId: "douglas-kerr",
        evidenceId: "page-plan",
        posture: "deflect",
        beat: "He initialled the plan with the investigation leading it, and says he would have run it himself.",
      },
      {
        suspectId: "douglas-kerr",
        evidenceId: "final-note",
        posture: "concede",
        beat: "She told him at five to midnight that the story was running, and he says he told her it was the right call.",
      },
      {
        suspectId: "nell-farrow",
        evidenceId: "printers-call",
        posture: "concede",
        beat: "She was on the line to the works from a quarter to one until two minutes past, and the foreman will say so.",
      },
      {
        suspectId: "nell-farrow",
        evidenceId: "final-note",
        posture: "crack",
        beat: "She got the byline and says it stopped mattering to her about an hour later.",
      },
      {
        suspectId: "vikram-rao",
        evidenceId: "production-door",
        posture: "deny",
        beat: "He says the door log has been unreliable since the system was changed and that he has reported it twice.",
      },
      {
        suspectId: "vikram-rao",
        evidenceId: "advance-proofs",
        posture: "crack",
        beat: "He says a proof leaving the subs' desk early is the easiest thing in the world and the hardest thing to prove.",
      },
      {
        suspectId: "harriet-slade",
        evidenceId: "swipe-log",
        posture: "crack",
        beat: "She waited in the lobby a while after leaving the newsroom, because she had not decided whether to go back up.",
      },
      {
        suspectId: "harriet-slade",
        evidenceId: "advance-proofs",
        posture: "concede",
        beat: "The proofs in her father's papers are real, and she says she found them before the editor did.",
      },
      {
        suspectId: "harriet-slade",
        evidenceId: "production-door",
        posture: "deny",
        beat: "Her card opens the front entrance and nothing else, and she has never been on the stone in her life.",
      },
    ],
  },
};

export function getProofSpec(mysteryId: string): ProofSpec | undefined {
  return DEDUCTION[mysteryId]?.proof;
}

export function getAlibiBreak(
  mysteryId: string,
  suspectId: string
): AlibiBreak | undefined {
  return DEDUCTION[mysteryId]?.alibiBreaks.find((b) => b.suspectId === suspectId);
}

export function getTrueLinks(mysteryId: string): TrueLink[] {
  return DEDUCTION[mysteryId]?.trueLinks ?? [];
}

export function getConfrontation(
  mysteryId: string,
  suspectId: string,
  evidenceId: string
): Confrontation | undefined {
  return DEDUCTION[mysteryId]?.confrontations.find(
    (c) => c.suspectId === suspectId && c.evidenceId === evidenceId
  );
}

export function getDeduction(mysteryId: string): DeductionSecrets | undefined {
  return DEDUCTION[mysteryId];
}
