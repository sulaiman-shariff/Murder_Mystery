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
 */

interface MysterySecrets {
  solution: MysterySolution;
  hintPlan: HintLevel[];
}

const SOLUTIONS: Record<string, MysterySecrets> = {
  "gilded-rose-mansion": {
    solution: {
      murderer: "Jonathan Reed",
      murdererAliases: [
        "Jonathan",
        "Reed",
        "Mr. Reed",
        "the artist",
        "the painter",
        "Jonathan Reed the artist",
      ],
      murdererDescription:
        "The artist whose work was unceremoniously discarded by Charles Rayburn",
      motiveSummary:
        "Jonathan Reed killed Charles Rayburn in a fit of vengeful rage after Charles pulled funding from his magnum opus — a commissioned painting that Jonathan had devoted years to creating. The betrayal, combined with Charles's dismissal of his artistic legacy, drove Jonathan to confront Charles in his study. When Charles refused to reconsider, Jonathan grabbed the letter opener in a moment of fury.",
      motiveRequiredConcepts: [
        "revenge",
        "artistic betrayal",
        "destroyed commission",
        "professional humiliation",
      ],
      acceptableMotiveInterpretations: [
        "Revenge for a past deception hidden within the mansion's walls",
        "A vendetta fueled by professional jealousy and wounded pride",
        "Retaliation for having his life's work destroyed",
      ],
      commonIncorrectMotiveInterpretations: [
        "A business dispute or financial disagreement",
        "Simple jealousy over talent or status",
        "A crime of opportunity during a robbery",
        "Romantic rivalry or love triangle",
      ],
      explanation:
        "Jonathan Reed was Charles Rayburn's most trusted artist, commissioned to create a masterpiece that would define both their legacies. When Charles unexpectedly pulled funding, claiming the project was too expensive, Jonathan felt personally betrayed. The burned canvas in the fireplace was Jonathan's way of destroying what he couldn't have. He came to the study that night to plead his case one last time, but Charles's dismissal pushed him over the edge. The letter opener — the murder weapon — came from Charles's own desk, suggesting a crime of passion rather than premeditation.",
      decisiveEvidenceIds: [
        "scattered-papers",
        "burned-painting",
        "servant-testimony",
      ],
    },
    hintPlan: [
      {
        level: 1,
        relevantEvidenceIds: ["whiskey-glass", "letter-opener"],
        objective: "Draw attention to the crime scene details",
        maximumRevelation:
          "The murder weapon came from the victim's own desk, suggesting this was not premeditated.",
      },
      {
        level: 2,
        relevantEvidenceIds: ["scattered-papers", "family-portrait"],
        objective: "Suggest examining documents and personal effects",
        maximumRevelation:
          "There was a recent professional conflict involving an art commission.",
      },
      {
        level: 3,
        relevantEvidenceIds: ["burned-painting", "servant-testimony"],
        objective: "Connect the destroyed artwork to the suspect",
        maximumRevelation:
          "Someone with artistic motives was seen near the study around the time of the murder.",
      },
      {
        level: 4,
        relevantEvidenceIds: ["financial-records"],
        objective: "Narrow to the suspect whose motive is personal betrayal",
        maximumRevelation:
          "Look for someone whose professional pride and life's work were destroyed by the victim.",
      },
      {
        level: 5,
        relevantEvidenceIds: ["servant-testimony", "burned-painting", "scattered-papers"],
        objective: "Guide toward the final conclusion",
        maximumRevelation:
          "The killer is not a family member but someone whose art and soul were discarded by the victim.",
      },
    ],
  },
  "hollowbrook-asylum": {
    solution: {
      murderer: "Daniel Mercer",
      murdererAliases: [
        "Daniel",
        "Mercer",
        "Mr. Mercer",
        "the patient",
        "the journalist",
        "the reporter",
      ],
      murdererDescription:
        "A former journalist whose psychotic break was caused by Thorne's experimental treatments",
      motiveSummary:
        "Daniel Mercer was a journalist who discovered Dr. Thorne's unethical experiments on patients. Before he could expose Thorne to the press, Thorne had him committed under a false diagnosis and subjected him to extreme treatments that shattered his mind. When Mercer's memory began returning, he realized what Thorne had done to him and sought vengeance.",
      motiveRequiredConcepts: [
        "vengeance",
        "unethical experiments",
        "psychological destruction",
        "silencing a whistleblower",
      ],
      acceptableMotiveInterpretations: [
        "Vengeance for a betrayal that destroyed his mind",
        "Personal vendetta against the man who ruined his life",
        "Desperate retaliation for medical abuse and torture",
      ],
      commonIncorrectMotiveInterpretations: [
        "The doctor was killed by a patient in a random violent episode",
        "Insurance fraud or financial motive",
        "A staff member's workplace grievance",
        "Revenge for a failed medical treatment",
      ],
      explanation:
        "Daniel Mercer was an investigative journalist who came to Hollowbrook posing as a patient to expose Dr. Thorne's unethical practices. When Thorne discovered the deception, he used his authority to have Mercer forcibly committed under a false identity. The experimental treatments — electroconvulsive therapy, sensory deprivation — were intended to break Mercer's mind and destroy his credibility. The treatments worked, causing a genuine psychotic break that erased Mercer's memory. But fragments returned — glimpses of who he was and what Thorne had done. The torn journal page ('He promised I would forget. But I remember everything') was Mercer's cry of awakening. On the night of the murder, Mercer confronted Thorne in his office. When Thorne reached for the sedative-laced coffee meant to silence him permanently, Mercer grabbed the letter opener and struck. The half-written letter was Thorne's confession — he knew he had gone too far.",
      decisiveEvidenceIds: [
        "torn-journal-page",
        "letter-opener",
        "false-name-records",
        "patient-testimony",
      ],
    },
    hintPlan: [
      {
        level: 1,
        relevantEvidenceIds: ["half-written-letter", "letter-opener", "hidden-key"],
        objective: "Draw attention to Thorne's final moments",
        maximumRevelation:
          "Dr. Thorne was writing something important when he died — something he regretted.",
      },
      {
        level: 2,
        relevantEvidenceIds: ["patient-testimony", "letter-opener", "bloodstained-glove"],
        objective: "Encourage investigating the hospital records",
        maximumRevelation:
          "Someone was admitted under a false name — a patient who shouldn't exist in the system.",
      },
      {
        level: 3,
        relevantEvidenceIds: ["torn-journal-page", "bloodstained-glove"],
        objective: "Connect the patient's journal to a specific suspect",
        maximumRevelation:
          "One patient remembers everything they were promised to forget. Their journal holds the key.",
      },
      {
        level: 4,
        relevantEvidenceIds: ["hidden-key", "false-name-records"],
        objective: "Reveal the connection between the journalist and the asylum",
        maximumRevelation:
          "The killer was not always a patient — they came to Hollowbrook for a purpose, and Thorne made sure they never left.",
      },
      {
        level: 5,
        relevantEvidenceIds: ["torn-journal-page", "bloodstained-glove", "patient-testimony"],
        objective: "Guide toward the final conclusion",
        maximumRevelation:
          "Look for the person whose very presence at Hollowbrook was a secret — someone Thorne tried to erase entirely.",
      },
    ],
  },
  "veil-of-ebonmere": {
    solution: {
      murderer: "Lady Seraphine Voss",
      murdererAliases: [
        "Seraphine",
        "Lady Voss",
        "Lady Seraphine",
        "the seer",
        "Seraphine Voss",
      ],
      murdererDescription:
        "The court seer and Aldren's most trusted confidante",
      motiveSummary:
        "Lady Seraphine Voss killed Aldren Thalor because his visions were becoming too powerful. As the veil between worlds thinned, Aldren began seeing truths that threatened the very fabric of Ebonmere. Seraphine, bound by an ancient oath as the realm's seer, believed that Aldren's revelations would usher in a catastrophe. She killed him to protect the realm from the darkness his visions would unleash — fulfilling the prophecy that 'the keeper of secrets must fall.'",
      motiveRequiredConcepts: [
        "prophecy",
        "protection",
        "silencing forbidden knowledge",
        "preserving the veil",
      ],
      acceptableMotiveInterpretations: [
        "Protection of a dark secret hidden beneath the city",
        "A prophecy fulfilled through bloodshed",
        "Elimination of a dangerous threat to the realm's balance",
        "An oath to an unseen force demanding sacrifice",
      ],
      commonIncorrectMotiveInterpretations: [
        "A political power grab for the throne",
        "Jealousy over Aldren's relationship with another court member",
        "A ritual sacrifice to gain power for herself",
        "Revenge for a personal slight or betrayal",
      ],
      explanation:
        "Lady Seraphine Voss was Aldren Thalor's most trusted ally — his confidante, his seer, and the keeper of the prophecy. As the veil between worlds thinned, Aldren's visions grew increasingly powerful. He began seeing truths that were never meant to be revealed: the true nature of the veil, the entities beyond it, and the fragile balance that kept Ebonmere safe. Seraphine knew that if Aldren continued to share these visions, he would draw the attention of the darkness beyond the veil. Bound by her ancient oath as seer of Ebonmere, she made the impossible choice. She deactivated the wards — a sequence known to only a trusted few — entered the Grand Hall, and confronted him. In his moment of trust, she used his own obsidian dagger, a ritual tool, to end his life. The carved message — 'The veil is thinning. He saw too much' — was both a warning and a confession. The torn fragment of her robe at the scene was the one detail she missed in her escape. Her grief is genuine — she loved Aldren as a friend — but her duty to the realm outweighed all else.",
      decisiveEvidenceIds: [
        "prophecy-scroll",
        "ward-logs",
        "vision-journal",
        "starry-robes",
      ],
    },
    hintPlan: [
      {
        level: 1,
        relevantEvidenceIds: ["obsidian-dagger", "carved-message"],
        objective: "Draw attention to the message and the weapon",
        maximumRevelation:
          "The message was written by the killer, not the victim. It's a confession of motive.",
      },
      {
        level: 2,
        relevantEvidenceIds: ["ward-logs", "alchemical-residue"],
        objective: "Encourage investigating the magical security",
        maximumRevelation:
          "Someone with knowledge of the citadel's deepest secrets deactivated the wards. Only a very small circle knew how.",
      },
      {
        level: 3,
        relevantEvidenceIds: ["prophecy-scroll", "vision-journal"],
        objective: "Reveal the prophecy and Aldren's fears",
        maximumRevelation:
          "Aldren knew he was in danger. His final journal entry suggests he told someone everything — and that may have been his undoing.",
      },
      {
        level: 4,
        relevantEvidenceIds: ["starry-robes", "ward-logs"],
        objective: "Connect the physical evidence to a suspect",
        maximumRevelation:
          "Look for someone who was both Aldren's closest confidante and the one person who could override the wards without force.",
      },
      {
        level: 5,
        relevantEvidenceIds: ["prophecy-scroll", "vision-journal", "starry-robes"],
        objective: "Guide toward the final conclusion",
        maximumRevelation:
          "The killer acted not out of hatred but out of duty. They believed Aldren's death was a sacrifice necessary to save the realm from what his visions would awaken.",
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
