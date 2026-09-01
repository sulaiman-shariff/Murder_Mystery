import "server-only";

import type { HintLevel, MysterySolution } from "@/types";

/**
 * Spoiler data lives here and ONLY here.
 *
 * This module is marked `server-only`, so importing it from a client
 * component is a build error. That is deliberate: murderers, motives,
 * explanations and the escalating hint script must never reach the browser
 * bundle, where any player could read them straight out of devtools.
 *
 * Players reach this content through two gated paths only:
 *   - /api/ai/* validates guesses and generates hints server-side
 *   - /api/mysteries/[mysteryId]/reveal returns the solution once the
 *     team's session is over (completed or failed)
 *
 * Each case is designed so the killer is three joins deep. Motive is spread
 * across every suspect; something objective — a key register, a cue sheet, a
 * door that only opens for one department — is what narrows it.
 */

interface MysterySecrets {
  solution: MysterySolution;
  hintPlan: HintLevel[];
}

const SOLUTIONS: Record<string, MysterySecrets> = {
  "room-314": {
    solution: {
      murderer: "Dinah Coyle",
      murdererAliases: [
        "Dinah",
        "Coyle",
        "Miss Coyle",
        "the night porter",
        "the porter",
        "the night staff",
        "Dinah Coyle",
      ],
      murdererDescription:
        "The night porter, who carried the second master card and whose mother's maiden name was Ellery",
      motiveSummary:
        "Victor Sallow was the lender who took Dinah Coyle's family home eleven months ago. Her mother's maiden name is Ellery — the name struck through in Sallow's ledger as settled, property surrendered, and the name on the unredeemed pawn ticket for her mother's locket that he still carried folded in his wallet. She took the night job at the Ashcombe because he wintered there every year. On the night, she left the desk unattended, let herself into 314 with her master card, and struck him once from behind with his own paperweight.",
      motiveRequiredConcepts: [
        "revenge",
        "he took her family's home",
        "the seized locket",
        "she sought him out",
      ],
      acceptableMotiveInterpretations: [
        "Revenge for ruining her family and taking their house",
        "She blamed him for her family losing everything and had been waiting for him",
        "Personal retribution against the lender who foreclosed on her mother",
      ],
      commonIncorrectMotiveInterpretations: [
        "A debt of her own that she could not repay",
        "Robbery — the wallet was left untouched with money in it",
        "A dispute about her job or her treatment at the hotel",
        "She killed him on somebody else's behalf",
        "An argument that got out of hand between strangers",
      ],
      explanation:
        "Everyone under that roof had a reason to want Sallow gone — Landon owed him, Vance inherited the business, Ash was watching her hotel fail. What none of them had was a way through the door. The lock recorded a staff master card at 9:47, and there are only two in the building. The key register accounts for the manager's: signed into the safe at 9:10 and never signed out again. That leaves the porter's, which has no return entry at all. The telephone log confirms the desk she claims never to have left stood unattended from 9:30 to 10:05, through the bell she did not answer. The motive was in Sallow's own wallet: a pawn ticket for a gold locket surrendered by a family named Ellery, the same name struck out of his ledger eleven months before — and Ellery is her mother's name. She had been standing behind that desk all winter waiting for him to come down.",
      decisiveEvidenceIds: ["door-log", "key-register", "pawn-ticket"],
    },
    hintPlan: [
      {
        level: 1,
        relevantEvidenceIds: ["the-paperweight", "door-log"],
        objective: "Point them at the door rather than at the motives",
        maximumRevelation:
          "Nobody brought a weapon. Start with how the door was opened, not with who wanted him dead.",
      },
      {
        level: 2,
        relevantEvidenceIds: ["door-log", "bar-tab"],
        objective: "Establish that access, not motive, is the discriminator",
        maximumRevelation:
          "A guest card opens one room. The card used at 9:47 was not a guest card, which rules out anyone who only holds one.",
      },
      {
        level: 3,
        relevantEvidenceIds: ["key-register"],
        objective: "Narrow the two master cards to one",
        maximumRevelation:
          "There are two master cards in the building. One of them is accounted for in writing for the whole of the relevant period.",
      },
      {
        level: 4,
        relevantEvidenceIds: ["house-phone-log"],
        objective: "Break the remaining alibi",
        maximumRevelation:
          "Someone claims to have been at their post all night. There is a thirty-five minute hole in that claim, and a bell that went unanswered inside it.",
      },
      {
        level: 5,
        relevantEvidenceIds: ["pawn-ticket", "debt-ledger"],
        objective: "Deliver the motive join without naming anyone",
        maximumRevelation:
          "One name appears twice in the victim's own papers — struck out of his ledger and written on a pawn ticket he never surrendered. It is a family name, and it belongs to somebody working in this hotel.",
      },
    ],
  },

  "vaughn-street": {
    solution: {
      murderer: "Tobias Frayne",
      murdererAliases: [
        "Tobias",
        "Frayne",
        "Mr. Frayne",
        "the understudy",
        "the cover",
        "Tobias Frayne",
      ],
      murdererDescription:
        "The understudy — the only person working the performance with no station and no record",
      motiveSummary:
        "Tobias Frayne had understudied the same part for six years and gone on twice. At the Act I interval the producer handed Roland Pike next season's company list, and Pike told Frayne his name was not on it — six years of sitting made up in a cold room, ended in a sentence. During Act II, while every other person working the show was tied to a station that writes down where they are, Frayne walked into the prompt corner and hit Pike once with a brace from the counterweight rail.",
      motiveRequiredConcepts: [
        "his career was over",
        "dropped from next season",
        "six years of waiting for nothing",
        "rage at the man who told him",
      ],
      acceptableMotiveInterpretations: [
        "He had just been told he was being let go after six years of understudying",
        "Fury at losing the only part he had been waiting for",
        "His one chance at the role was taken away permanently",
      ],
      commonIncorrectMotiveInterpretations: [
        "A row over a byline or billing",
        "He was being blackmailed by the victim",
        "Jealousy of the leading actress specifically",
        "He was protecting the theatre's finances",
        "A long-running personal feud",
      ],
      explanation:
        "Everyone backstage had a reason. Wren had been called unreliable in writing, Devlin had been reported to the board, Bell was about to lose his theatre over the returns. What separates them is that a theatre in performance writes down where its people are. The cue sheet holds two actors on stage through the whole of the opening scene of Act II. The lighting board logs four cues taken by hand at a desk four floors and a locked door from the wings. The box-office till roll has the returns window worked until 8:58. Every one of those is a machine or a document saying: not this one. The brace carries a smear of Number Five greasepaint, so the killer was made up — and of the two people in that building wearing makeup, one of them was in front of eight hundred witnesses. The understudy is made up every night and given nothing to do. He is the only person working that show whose whereabouts nothing records, and the stage door book proves he never left.",
      decisiveEvidenceIds: [
        "iron-brace",
        "cue-sheet",
        "lighting-log",
        "next-season-list",
      ],
    },
    hintPlan: [
      {
        level: 1,
        relevantEvidenceIds: ["iron-brace"],
        objective: "Draw attention to the trace on the weapon",
        maximumRevelation:
          "The weapon was picked up in the wings, so the killer was already backstage. Look at what was left on the grip.",
      },
      {
        level: 2,
        relevantEvidenceIds: ["cue-sheet", "lighting-log"],
        objective: "Establish that stations produce alibis",
        maximumRevelation:
          "Almost everyone working a performance is tied to a station that keeps its own record. Read those records as eliminations.",
      },
      {
        level: 3,
        relevantEvidenceIds: ["box-office-roll", "stage-door-book"],
        objective: "Close the remaining exits",
        maximumRevelation:
          "The third station accounts for another of them, and nobody signed out of the building before the curtain came down.",
      },
      {
        level: 4,
        relevantEvidenceIds: ["iron-brace", "cue-sheet"],
        objective: "Force the greasepaint join",
        maximumRevelation:
          "Two people in this company were in full makeup during Act II. One of them was standing in front of eight hundred people.",
      },
      {
        level: 5,
        relevantEvidenceIds: ["next-season-list"],
        objective: "Deliver the motive without naming anyone",
        maximumRevelation:
          "Ask who in this building has a job that requires them to be present and gives them nothing to do — and then read whose name is missing from next season.",
      },
    ],
  },

  "northolt-press": {
    solution: {
      murderer: "Vikram Rao",
      murdererAliases: [
        "Vikram",
        "Rao",
        "Mr. Rao",
        "the subeditor",
        "the sub",
        "the chief sub",
        "the stone hand",
        "Vikram Rao",
      ],
      murdererDescription:
        "The chief subeditor — thirty-one years on the paper, and the only person who could remake a plated page",
      motiveSummary:
        "Vikram Rao was the leak. For six years he had passed page proofs of the paper's investigations to the proprietor before they ran, and Iris Bellamy's story was going to name him for it. Her last note records that she had told the leak she knew, and would print his name in the second edition unless he resigned that night. Thirty-one years and a pension a year from vesting were about to end in disgrace. He killed her with the spike on her desk, then did the one thing nobody else in the building could do — walked onto the stone and remade page one by hand.",
      motiveRequiredConcepts: [
        "he was the leak",
        "she was about to name him",
        "thirty-one years and his pension",
        "silencing the story",
      ],
      acceptableMotiveInterpretations: [
        "He had been secretly passing proofs to the proprietor and was about to be exposed",
        "To stop her printing his name and ending his career",
        "Self-preservation — the story would have destroyed him after thirty-one years",
      ],
      commonIncorrectMotiveInterpretations: [
        "To protect the proprietor or his family",
        "Resentment at being passed over for the editorship",
        "A dispute over the byline on the story",
        "He was paid to stop the story by someone outside the paper",
        "He was ordered to do it by the board",
      ],
      explanation:
        "The story died at 12:52 AM, and that is the fact that matters. After midnight a page cannot be killed by deleting a file — it has to be remade by hand on the stone, and the stone is behind a door that opens for production staff and nobody else. That single constraint removes three of the four: the deputy and the reporter carry editorial cards, the proprietor's daughter a visitor card, and the door's own log shows one card on that floor for the whole period and no others. The building log puts the deputy out of the front entrance at 12:40 and the visitor a minute later, and the print works held a reporter on the phone from 12:45 to 1:02. The proofs in Bellamy's locked drawer show that the leak was somebody who handled pages before they ran, which is the subs' desk. Her last shorthand note names the day, the decision and the ultimatum: she had told the leak she knew, and would print it unless he resigned that night. He had thirty-one years behind him and a pension a year ahead of him.",
      decisiveEvidenceIds: [
        "page-plan",
        "production-door",
        "advance-proofs",
        "final-note",
      ],
    },
    hintPlan: [
      {
        level: 1,
        relevantEvidenceIds: ["the-spike", "page-plan"],
        objective: "Anchor them to the act rather than the motive",
        maximumRevelation:
          "Two things happened that night: a woman was killed and a page was changed. The second one is easier to trace.",
      },
      {
        level: 2,
        relevantEvidenceIds: ["swipe-log", "printers-call"],
        objective: "Use the records to remove people",
        maximumRevelation:
          "Two people left the building before one o'clock and a third was on a logged telephone line for seventeen minutes. Read those as eliminations.",
      },
      {
        level: 3,
        relevantEvidenceIds: ["page-plan", "production-door"],
        objective: "Surface the capability constraint",
        maximumRevelation:
          "Changing a plated page after midnight is physical work in one particular room, and that room does not open for everybody.",
      },
      {
        level: 4,
        relevantEvidenceIds: ["advance-proofs"],
        objective: "Identify the department the leak sat in",
        maximumRevelation:
          "Whoever was passing proofs out had to be handling them before they ran. That is a job, and only one department does it.",
      },
      {
        level: 5,
        relevantEvidenceIds: ["final-note", "production-door"],
        objective: "Deliver the closing join without naming anyone",
        maximumRevelation:
          "Her last note says she confronted the leak and gave him until the second edition. The person who killed the story is the person she was threatening to print.",
      },
    ],
  },
};

export function getSolutionById(mysteryId: string): MysterySolution | undefined {
  return SOLUTIONS[mysteryId]?.solution;
}

export function getHintPlanById(mysteryId: string): HintLevel[] {
  return SOLUTIONS[mysteryId]?.hintPlan ?? [];
}

export function getHintLevel(mysteryId: string, level: number): HintLevel | undefined {
  return getHintPlanById(mysteryId).find((h) => h.level === level);
}
