import type { Mystery } from "@/types";

export const veilOfEbonmere: Mystery = {
  id: "veil-of-ebonmere",
  order: 3,
  title: "The Veil of Ebonmere",
  subtitle: "A Shrouded Realm of Magic and Murder",
  victim: {
    name: "High Magister Aldren Thalor",
    role: "Master of the Order of Arcana",
    description:
      "A powerful mage and keeper of ancient knowledge. His ornate robes, woven with threads of starfire, are stained with blood. His right hand clutches an obsidian dagger with veins of glowing emerald. His eyes stare vacant, as though looking into something unspeakable.",
  },
  introduction:
    "Beneath twin moons, cradled by mountains of obsidian and forests of silver-tinged trees, lies the city of Ebonmere. A realm where magic and whispers intertwine. The air shimmers with an unnatural stillness, and the great spires of the citadel pierce the misted heavens. Within the heart of the citadel, the price of knowledge has been paid in blood.",
  storySections: [
    {
      id: "grand-hall",
      title: "The Grand Hall of Arcana",
      content:
        "The wind carries the scent of crushed sage and burnt embers as you step into the Grand Hall. A vast chamber of soaring arches and cascading drapes of celestial silk, it was once a sanctuary of wisdom. Now, it is a tomb. High Magister Aldren Thalor lies slumped over his ceremonial table. There is no sign of forced entry, no shattered vials of poison. The wards guarding the hall remain untouched, their sigils pulsing with arcane power. The murder happened within a room meant to be impenetrable.",
    },
    {
      id: "carved-message",
      title: "The Carved Warning",
      content:
        "A single phrase is carved into the wood of the table before Aldren's body, written in a language thought lost to time: 'The veil is thinning. He saw too much.' The message was carved with Aldren's own obsidian dagger — the same one clutched in his dead hand.",
    },
    {
      id: "prophecy",
      title: "The Seer's Warning",
      content:
        "Whispers among the citadel speak of a prophecy — that when the veil between worlds thins, a seer would rise to protect the realm from what lies beyond. High Magister Thalor had recently been experiencing visions, strange and terrible visions of encroaching darkness. He had begun confiding in someone close to him, sharing what he saw through the veil.",
    },
  ],
  suspects: [
    {
      id: "seraphine-voss",
      name: "Lady Seraphine Voss",
      role: "The Seer",
      relationshipToVictim: "Closest confidante and court seer",
      statement:
        "The veil between worlds grows thin. Aldren saw what was coming. He tried to warn us, but some truths are too terrible to bear.",
      alibi: "Was in the observation tower, 'reading the stars'",
      suspiciousDetails: [
        "Was Aldren's closest confidante, sharing visions and fears",
        "Her eyes, pools of liquid mercury, seem to see beyond the physical realm",
        "Haunted quality to her words — as though she glimpsed the horrors too",
        "Has knowledge of the prophecy that others don't",
        "Only person who knew the full extent of Aldren's visions",
      ],
    },
    {
      id: "marcus-blackwood",
      name: "Lord Marcus Blackwood",
      role: "The Alchemist",
      relationshipToVictim: "Rival and competitor for arcane knowledge",
      statement:
        "Aldren was a fool. He thought he could control forces beyond mortal comprehension. The old magic is not meant to be wielded by human hands.",
      alibi: "Claims he was in his laboratory conducting experiments",
      suspiciousDetails: [
        "Long-standing rivalry with Aldren for control of the council",
        "Competed for favor and access to ancient knowledge",
        "Hands stained with the residue of countless experiments",
        "Bitter tone suggests more than professional rivalry",
        "Something beneath the surface — fear or desperation",
      ],
    },
    {
      id: "isolde-frost",
      name: "Captain Isolde Frost",
      role: "The Guardian",
      relationshipToVictim: "Commander of the citadel's guard",
      statement:
        "I failed him. The wards should have protected him. They should have kept him safe.",
      alibi: "Was at her post at the main gates",
      suspiciousDetails: [
        "Responsible for the security of the Grand Hall",
        "The murder represents a failure of her sacred duty",
        "Guilt seems genuine, but could be guilt of complicity",
        "Had access to ward schematics and could have disabled them",
        "Her loyalty to Aldren versus the realm may have been tested",
      ],
    },
  ],
  evidence: [
    {
      id: "obsidian-dagger",
      title: "Obsidian Dagger",
      description:
        "An obsidian dagger with veins of glowing emerald, clutched in Aldren's own hand. It's both the murder weapon and a ritual tool. The blade bears traces of blood and residual arcane energy.",
      category: "physical",
      relatedSuspectIds: [],
      unlockStage: 1,
    },
    {
      id: "carved-message",
      title: "Carved Warning Message",
      description:
        "'The veil is thinning. He saw too much.' Carved into the ceremonial table in a language thought lost. The carving was done with the obsidian dagger.",
      category: "physical",
      relatedSuspectIds: [],
      unlockStage: 1,
    },
    {
      id: "prophecy-scroll",
      title: "Ancient Prophecy Scroll",
      description:
        "A scroll hidden in Aldren's private chambers, detailing an ancient prophecy: 'When the veil thins, the seer must rise. The keeper of secrets must fall. One who sees beyond must silence the voice that reveals.' It suggests Aldren foresaw his own death.",
      category: "document",
      relatedSuspectIds: ["seraphine-voss"],
      unlockStage: 3,
    },
    {
      id: "ward-logs",
      title: "Ward Activation Logs",
      description:
        "The magical wards around the Grand Hall were deactivated for exactly 15 minutes — long enough for the murder to occur. Only three people knew the ward override sequence: Aldren himself, Captain Isolde Frost, and the person Aldren designated as his emergency contact — Lady Seraphine Voss.",
      category: "digital",
      relatedSuspectIds: ["seraphine-voss", "isolde-frost"],
      unlockStage: 2,
    },
    {
      id: "vision-journal",
      title: "Aldren's Vision Journal",
      description:
        "Aldren's personal journal details his recent visions. He wrote of a 'darkness beyond the veil' and a 'betrayer wearing the face of a friend.' His final entry reads: 'I told her everything. Perhaps that was my mistake.'",
      category: "document",
      relatedSuspectIds: ["seraphine-voss"],
      unlockStage: 3,
    },
    {
      id: "alchemical-residue",
      title: "Alchemical Residue",
      description:
        "Trace amounts of a rare alchemical compound found on the ceremonial table. It's a truth-serum component — used to force someone to speak of what they've seen. Lord Blackwood is the only alchemist in the citadel who produces this compound.",
      category: "physical",
      relatedSuspectIds: ["marcus-blackwood"],
      unlockStage: 2,
    },
    {
      id: "starry-robes",
      title: "Torn Fragment of Starfire Silk",
      description:
        "A torn fragment of starfire silk found caught on the edge of the ceremonial table. The color matches Lady Seraphine Voss's robes. She claims she hasn't been in the Grand Hall in days.",
      category: "physical",
      relatedSuspectIds: ["seraphine-voss"],
      unlockStage: 4,
    },
  ],
  timeline: [
    {
      time: "Dusk",
      event: "Aldren Thalor enters the Grand Hall for a private meeting.",
    },
    {
      time: "Twilight",
      event: "Lady Seraphine Voss is seen heading toward the Grand Hall tower.",
      relatedSuspectId: "seraphine-voss",
    },
    {
      time: "Nightfall",
      event: "The wards around the Grand Hall are momentarily deactivated.",
    },
    {
      time: "Nightfall + 15 min",
      event: "The wards are reactivated.",
    },
    {
      time: "Midnight",
      event: "Captain Isolde Frost discovers Aldren's body during her patrol.",
      relatedSuspectId: "isolde-frost",
    },
  ],
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
};
