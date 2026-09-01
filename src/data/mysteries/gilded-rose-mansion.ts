import type { Mystery } from "@/types";

export const gildedRoseMansion: Mystery = {
  id: "gilded-rose-mansion",
  order: 1,
  title: "The Gilded Rose Mansion",
  subtitle: "An Opulent Yet Hidden Deception",
  victim: {
    name: "Charles Rayburn",
    role: "Patriarch and business mogul",
    description:
      "A man of power whose commanding presence demanded respect. His sharp mind and ruthless drive built an empire, but also created enemies along the way. Found slumped over his desk with a letter opener in his chest.",
  },
  introduction:
    "The Gilded Rose Mansion stands on a hill, its towering silhouette reaching towards the dusky sky. Beneath its beauty lies an unsettling truth. Tonight, the mansion is no longer a symbol of elegance—it is a place where wealth, power, and long-held secrets have converged in a deadly fashion. You've been called here to uncover what lies beneath the pristine surface.",
  storySections: [
    {
      id: "arrival",
      title: "The Journey to the Mansion",
      content:
        "The ride to the mansion is long and winding, the path veering into thickening woods. The moon hangs low, casting pale light onto the winding gravel road. As you step out of the car and approach the gates, a chill runs down your spine. The heavy front gates stand ajar, creaking slightly in the wind. Something is wrong. The scene before you feels heavy, suffused with an unnerving stillness.",
    },
    {
      id: "interior",
      title: "The Interior of the Mansion",
      content:
        "Stepping inside, marble floors stretch across the foyer, polished to a high shine. Crystal chandeliers hang from the ceiling. The walls are adorned with expensive paintings framed in gold. The faint scent of roses lingers in the air, mingling with wood polish and expensive perfume. Yet despite its beauty, there's an undeniable tension. Servants move quick and silent, avoiding eye contact. Guests whisper in hushed tones, their faces drawn with fear.",
    },
    {
      id: "crime-scene",
      title: "The Study: The Scene of the Crime",
      content:
        "You are led down a long hallway toward the study. The door creaks open, revealing the grim scene inside. Dark wood paneling contrasts with heavy drapes. A massive fireplace dominates one wall, its hearth cold and empty. The desk, once meticulously organized, now lies in chaos. Papers are scattered across the surface, a glass of whiskey toppled over, its contents spilling onto a fine silk napkin. The body of Charles Rayburn is slumped over the desk, his arms outstretched. A letter opener, sharp and deadly, juts from his chest.",
    },
    {
      id: "family-background",
      title: "The Rayburn Family",
      content:
        "The Rayburn family has been one of the city's most influential names for decades. Charles Rayburn built an empire through sharp business dealings. He had three family members close to him: Lydia, his only daughter; Maxwell, his nephew; and Evelyn, his wife. Each had complicated relationships with Charles. The family members are scattered throughout the mansion, each processing the events in their own way.",
    },
  ],
  suspects: [
    {
      id: "lydia-rayburn",
      name: "Lydia Rayburn",
      role: "The Daughter",
      relationshipToVictim: "Only daughter of Charles Rayburn",
      statement:
        "I didn't expect this… not like this. We had disagreements, yes. But I never thought it would come to this.",
      alibi: "Claims she was in her room when the murder occurred",
      suspiciousDetails: [
        "Rumors of growing dissatisfaction with her father's refusal to cede control of the business",
        "Her grief doesn't quite reach her eyes",
        "There's a calculating edge beneath her sorrow",
        "Had been managing business affairs and expected to inherit control",
      ],
    },
    {
      id: "maxwell-rayburn",
      name: "Maxwell Rayburn",
      role: "The Nephew",
      relationshipToVictim: "Nephew, eager to inherit the family business",
      statement:
        "I've been waiting for my chance. But Charles was too proud to see my potential. He wouldn't let me take charge. It's always been Lydia's way or no way.",
      alibi: "Claims he was in the parlor when the murder occurred",
      suspiciousDetails: [
        "Charles consistently overlooked him in favor of his only child",
        "His attempts to prove himself were met with rejection",
        "Deep resentment toward his uncle",
        "His anger feels personal and long-nurtured",
      ],
    },
    {
      id: "evelyn-rayburn",
      name: "Evelyn Rayburn",
      role: "The Wife",
      relationshipToVictim: "Wife of Charles Rayburn",
      statement:
        "I can't believe he's gone. Charles… he was so stubborn. I warned him. I told him that his decisions were tearing the family apart.",
      alibi: "Claims she was in the garden by the fountain",
      suspiciousDetails: [
        "Her grief seems genuine but there's an undercurrent of something darker",
        "Hints at frustrations with her husband without elaborating",
        "Described Charles's decisions as 'tearing the family apart'",
      ],
    },
    {
      id: "jonathan-reed",
      name: "Jonathan Reed",
      role: "The Artist",
      relationshipToVictim: "Former confidante and commissioned artist",
      statement:
        "You can't imagine how it feels to give everything you have to a man, only to be thrown aside when things get tough. I didn't kill him, but I sure didn't like him by the end.",
      alibi: "Near the study door, arms crossed, but no confirmed alibi",
      suspiciousDetails: [
        "Had a recent falling out with Charles over an unfinished project",
        "Charles pulled funding on a project Jonathan had poured his heart into",
        "Carries deep bitterness and unresolved anger",
        "Was found standing near the study — closest to the crime scene",
        "No one can confirm his whereabouts at the time of death",
      ],
    },
  ],
  evidence: [
    {
      id: "letter-opener",
      title: "Letter Opener",
      description:
        "A sharp ornamental letter opener protruding from Charles's chest. It's the murder weapon, taken from his own desk.",
      category: "physical",
      relatedSuspectIds: [],
      unlockStage: 1,
    },
    {
      id: "scattered-papers",
      title: "Scattered Desk Papers",
      description:
        "Papers scattered across the desk surface. Among them is a partially written letter of dismissal regarding an art commission — the artist's name crossed out but still legible.",
      category: "document",
      relatedSuspectIds: ["jonathan-reed"],
      unlockStage: 2,
    },
    {
      id: "whiskey-glass",
      title: "Toppled Whiskey Glass",
      description:
        "A crystal glass knocked over, its contents spilling onto a silk napkin. It suggests a struggle or sudden movement before death.",
      category: "physical",
      relatedSuspectIds: [],
      unlockStage: 1,
    },
    {
      id: "burned-painting",
      title: "Burned Canvas in the Fireplace",
      description:
        "In the cold fireplace, fragments of a burned canvas are found. The style matches Jonathan Reed's work. The painting was deliberately destroyed before the murder.",
      category: "physical",
      relatedSuspectIds: ["jonathan-reed"],
      unlockStage: 3,
    },
    {
      id: "servant-testimony",
      title: "Servant's Testimony",
      description:
        "A maid reports hearing raised voices from the study around 9 PM — a heated argument between Charles and someone whose voice she didn't recognize. Shortly after, she saw Jonathan Reed leaving the study in a hurry.",
      category: "statement",
      relatedSuspectIds: ["jonathan-reed"],
      unlockStage: 3,
    },
    {
      id: "financial-records",
      title: "Financial Records",
      description:
        "A ledger showing recent large withdrawals from the household accounts. Charles had been paying significant sums to an unknown recipient — possibly hush money related to a hidden affair or business secret.",
      category: "document",
      relatedSuspectIds: ["evelyn-rayburn", "lydia-rayburn"],
      unlockStage: 4,
    },
    {
      id: "family-portrait",
      title: "Torn Family Portrait",
      description:
        "A photograph of the Rayburn family, torn in half. The missing half appears to be of Charles. Found crumpled in a wastebasket in Lydia's room.",
      category: "physical",
      relatedSuspectIds: ["lydia-rayburn"],
      unlockStage: 2,
    },
  ],
  timeline: [
    {
      time: "7:00 PM",
      event: "Dinner service begins. All family members present.",
    },
    {
      time: "8:30 PM",
      event: "Charles excuses himself to the study for a private meeting.",
    },
    {
      time: "8:45 PM",
      event: "Jonathan Reed is seen heading toward the study wing.",
      relatedSuspectId: "jonathan-reed",
    },
    {
      time: "9:00 PM",
      event: "A maid hears raised voices from the study.",
    },
    {
      time: "9:15 PM",
      event: "Jonathan Reed is seen leaving the study area in a hurry.",
      relatedSuspectId: "jonathan-reed",
    },
    {
      time: "9:30 PM",
      event: "Evelyn Rayburn is seen in the garden by the fountain.",
      relatedSuspectId: "evelyn-rayburn",
    },
    {
      time: "10:00 PM",
      event: "Lydia Rayburn discovers the body and raises the alarm.",
      relatedSuspectId: "lydia-rayburn",
    },
  ],
  hintCount: 5,
};
