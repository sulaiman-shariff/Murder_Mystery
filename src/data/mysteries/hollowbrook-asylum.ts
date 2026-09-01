import type { Mystery } from "@/types";

export const hollowbrookAsylum: Mystery = {
  id: "hollowbrook-asylum",
  order: 2,
  title: "The Hollowbrook Asylum",
  subtitle: "A Descent into Darkness",
  victim: {
    name: "Dr. Elias Thorne",
    role: "Chief Psychiatrist",
    description:
      "A man of sharp intellect and colder disposition. Known for unorthodox and extreme methods — electroconvulsive therapy, sensory deprivation, forced regression. Both revered and feared. Found stabbed to death in his office with a single, clean wound to the heart.",
  },
  introduction:
    "The Hollowbrook Asylum, once a beacon of hope, now stands as a decaying relic against the night sky. You were summoned by a desperate voice whispering through static: 'Detective… there's been a murder at Hollowbrook. Dr. Thorne is dead. And I think someone is watching me.'",
  storySections: [
    {
      id: "arrival",
      title: "Arrival at the Asylum",
      content:
        "As you step onto the cracked stone pathway, a sudden gust of wind rustles the skeletal branches of gnarled trees. The wrought-iron gate slams shut behind you with a resonating clang. The air is thick with the scent of damp earth, disinfectant, and something metallic. The heavy double doors groan as you push them open, revealing a dimly lit reception area. A flickering overhead light casts jagged shadows along the walls.",
    },
    {
      id: "crime-scene",
      title: "The Office of Dr. Thorne",
      content:
        "Dr. Thorne's body was found in his office, seated in his grand mahogany chair, his head slumped forward as though in deep contemplation. A pool of blood stains his pristine white coat. A single, clean stab wound to the heart. No signs of struggle, no evidence of forced entry. Dark wooden shelves line the walls, filled with thick medical tomes and case files. A record player sits on his desk, the needle still resting on the vinyl. A shattered coffee mug lies near his feet. A half-written letter sits on his desk, the ink trailing off mid-sentence.",
    },
    {
      id: "half-written-letter",
      title: "The Letter",
      content:
        "A half-written letter lies on Dr. Thorne's desk, addressed to no one. It reads: 'I fear I have made a mistake. I should not have pursued—' The ink trails off, a deep scratch in the paper where the pen had pressed too hard before slipping from his grasp. Whatever he was about to reveal, he never finished.",
    },
  ],
  suspects: [
    {
      id: "vivian-hale",
      name: "Dr. Vivian Hale",
      role: "The Protégé",
      relationshipToVictim: "Former student and close colleague",
      statement:
        "He was brilliant. But he had become reckless. I warned him. I told him he was pushing too far. But he wouldn't listen.",
      alibi: "Claims she was in the observation room reviewing patient files",
      suspiciousDetails: [
        "Worked closely with Thorne for years, absorbing his methods",
        "Recent schism between mentor and student",
        "Growing unease over his practices",
        "Barely concealed nervousness in her demeanor",
        "Something hidden beneath her composed facade — resentment or fear",
      ],
    },
    {
      id: "daniel-mercer",
      name: "Daniel Mercer",
      role: "The Patient",
      relationshipToVictim: "Former journalist, now a patient under Thorne's care",
      statement:
        "You think I killed him? Dr. Thorne had plenty of enemies. I was just one of the few who saw him for what he really was. Do you know what happens when you peel back the layers of a man like that? You find a monster beneath.",
      alibi: "No confirmed alibi — claims he was in the common room",
      suspiciousDetails: [
        "Former journalist who checked himself in after a psychotic break",
        "Took particular interest in Thorne's experiments",
        "Collected notes, observations, and secrets about Thorne",
        "Hands tremble as he speaks",
        "Gaze darts to corners of the room as if expecting something to emerge",
        "His journal contains damning observations about Thorne's methods",
      ],
    },
    {
      id: "eleanor-bishop",
      name: "Eleanor Bishop",
      role: "The Nurse",
      relationshipToVictim: "Long-serving nurse at Hollowbrook",
      statement:
        "Dr. Thorne thought he knew best. He thought he could play god. But he didn't understand… some things shouldn't be meddled with. Some doors, once opened, can never be closed.",
      alibi: "Claims she was making rounds in the east wing",
      suspiciousDetails: [
        "Had been at Hollowbrook longer than most",
        "Often seen arguing with Thorne",
        "Her loyalty to him was unclear",
        "Haunted expression — seems to know more than she reveals",
        "Claims she heard 'a sound I'll never forget. It wasn't human.'",
      ],
    },
    {
      id: "lawrence-thorne",
      name: "Lawrence Thorne",
      role: "The Brother",
      relationshipToVictim: "Estranged younger brother",
      statement:
        "I came to confront him. To make him face the past. But when I arrived, he was already dead.",
      alibi: "Arrived at Hollowbrook unannounced the night of the murder",
      suspiciousDetails: [
        "Estranged from Elias for years",
        "Always resented his brother's cold ambition",
        "Convenient alibi — claims to have arrived after the murder",
        "Grief seems genuine but old anger lingers beneath",
        "His arrival time is not corroborated by any staff member",
      ],
    },
  ],
  evidence: [
    {
      id: "letter-opener",
      title: "Bloodied Letter Opener",
      description:
        "A brass letter opener with a bloodied tip found near Dr. Thorne's desk. The wound appears consistent with a rapid, close-range strike — suggesting a crime of passion rather than premeditation.",
      category: "physical",
      relatedSuspectIds: ["daniel-mercer"],
      unlockStage: 1,
    },
    {
      id: "half-written-letter",
      title: "Half-Written Letter",
      description:
        "'I fear I have made a mistake. I should not have pursued—' The letter trails off with a deep scratch in the paper. It suggests Thorne was grappling with a decision or discovery shortly before his death.",
      category: "document",
      relatedSuspectIds: [],
      unlockStage: 1,
    },
    {
      id: "hidden-key",
      title: "Hidden Compartment Key",
      description:
        "A hidden compartment in Thorne's desk contains a key with no known lock. It appears to belong to a locked cabinet in the archives.",
      category: "physical",
      relatedSuspectIds: ["vivian-hale"],
      unlockStage: 2,
    },
    {
      id: "bloodstained-glove",
      title: "Bloodstained Glove",
      description:
        "A single bloodstained glove found discarded in the laundry chute. The blood type matches Dr. Thorne's. The glove is too large for a woman's hand.",
      category: "physical",
      relatedSuspectIds: ["daniel-mercer", "lawrence-thorne"],
      unlockStage: 2,
    },
    {
      id: "torn-journal-page",
      title: "Torn Journal Page",
      description:
        "A torn page from a patient's journal, scrawled with: 'He promised I would forget. But I remember everything.' The handwriting matches Daniel Mercer's medical file.",
      category: "document",
      relatedSuspectIds: ["daniel-mercer"],
      unlockStage: 3,
    },
    {
      id: "false-name-records",
      title: "Patient Under False Name",
      description:
        "Medical records indicate a patient admitted under a false name — someone who was erased from the system. Cross-referencing suggests this patient was connected to a scandal Thorne had covered up years ago.",
      category: "document",
      relatedSuspectIds: ["daniel-mercer", "vivian-hale"],
      unlockStage: 3,
    },
    {
      id: "shattered-coffee-mug",
      title: "Shattered Coffee Mug",
      description:
        "A coffee mug shattered near Thorne's feet. The fragments contain traces of a sedative not prescribed to Thorne. Someone may have attempted to drug him.",
      category: "physical",
      relatedSuspectIds: [],
      unlockStage: 4,
    },
    {
      id: "patient-testimony",
      title: "Patient Whispers",
      description:
        "Multiple patients whisper about a 'reporter who asked too many questions' — a man who was committed shortly after threatening to expose Thorne's unethical experiments to the press.",
      category: "statement",
      relatedSuspectIds: ["daniel-mercer"],
      unlockStage: 2,
    },
  ],
  timeline: [
    {
      time: "6:00 PM",
      event: "Dr. Thorne holds his final therapy session with Daniel Mercer.",
      relatedSuspectId: "daniel-mercer",
    },
    {
      time: "7:00 PM",
      event: "Thorne returns to his office alone. The record player is heard.",
    },
    {
      time: "7:30 PM",
      event: "Eleanor Bishop is seen arguing with Thorne outside his office.",
      relatedSuspectId: "eleanor-bishop",
    },
    {
      time: "8:30 PM",
      event: "Lawrence Thorne arrives at the asylum, having been called after the murder was discovered.",
      relatedSuspectId: "lawrence-thorne",
    },
    {
      time: "8:15 PM",
      event: "A nurse hears a loud thud from Thorne's office but assumes it's his record player.",
    },
    {
      time: "9:00 PM",
      event: "Dr. Vivian Hale discovers the body.",
      relatedSuspectId: "vivian-hale",
    },
  ],
  hintCount: 5,
};
