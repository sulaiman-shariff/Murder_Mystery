import type { Mystery } from "@/types";

/**
 * Case 3 — engine: capability. Not "who was there" but "who could have done
 * the one thing the killer did" — pulled a story off a plated page.
 *
 * Motive is spread across all four. The building log narrows it to who stayed,
 * and the production door narrows it to who could reach the stone. Three joins,
 * same as the others: this case is the most intricate but not the least fair.
 *
 * Case clock: t is minutes from midnight.
 */
export const northoltPress: Mystery = {
  id: "northolt-press",
  order: 3,
  title: "The Northolt Press",
  subtitle: "Stop the Presses",
  victim: {
    name: "Iris Bellamy",
    role: "Editor",
    age: 47,
    description:
      "Nine years in the chair and not a comfortable one. She had spent three months on a story about her own paper's proprietor, and had told exactly four people it was running. Found at her desk after the second edition had gone, killed with the copy spike she kept beside her typewriter.",
  },
  introduction:
    "The Northolt Press puts a first edition to bed at midnight and a second at half past one. Somewhere between the two, the lead story on page one was pulled and replaced with a flower show, and Iris Bellamy stopped answering her phone. The cleaner found her at twenty to two. Everything in a newspaper office is written down twice — who came in, who logged on, what went on the page and when. The difficulty will not be finding records. It will be working out which one of them describes something only one person could have done.",
  places: [
    { id: "np-newsroom", name: "The Newsroom" },
    { id: "np-stone", name: "The Stone (Production Floor)" },
    { id: "np-front-door", name: "The Front Entrance" },
    { id: "np-editors-office", name: "The Editor's Office" },
    { id: "np-phone-room", name: "The Copy Phone Room" },
  ],
  storySections: [
    {
      id: "the-paper",
      title: "The Northolt Press",
      content:
        "A regional daily of forty thousand copies, owned for two generations by the same family. It employs sixty people, most of whom have been there a long time, and it is the only paper in the county that still sets its own pages. Everyone here knows how the building works, which is both the charm of the place and the problem with it.",
    },
    {
      id: "the-story",
      title: "The Story",
      content:
        "For three months Iris Bellamy had been assembling a piece about the proprietor: advance copies of the paper's own investigations passed quietly to the people they concerned, over a period of years. It was written, lawyered and slotted for page one of the second edition. Four people knew it was running. By half past one it had been replaced with three hundred words on a flower show, and the plate had been remade.",
    },
    {
      id: "how-a-page-changes",
      title: "How a Page Changes After Midnight",
      content:
        "Once the first edition is away, a page can only be altered on the stone — the production floor where the pages are physically made up and the plates cast. The stone is behind a door that opens to production staff only; editorial cards do not work on it, and the proprietor's own family cannot get through it. Changing a plated page after midnight is not a matter of deleting a file. Somebody has to walk onto the stone and remake it by hand.",
    },
  ],
  suspects: [
    {
      id: "douglas-kerr",
      name: "Douglas Kerr",
      role: "The Deputy Editor",
      relationshipToVictim: "Passed over for her job nine years ago",
      statement:
        "I was deputy to a woman eight years younger than me for nine years. I made my peace with that a long time before somebody put a spike in her.",
      alibi: {
        id: "np-alibi-douglas",
        claim: "I went home once the first edition was away. Twenty to one, near enough.",
        placeId: "np-front-door",
        from: 40,
        to: 100,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Applied for the editorship twice and was refused twice",
        "Holds the editor's system credentials for when she is on leave",
        "Initialled the page-one plan an hour before the story was pulled",
        "Carries an editorial card, which does not open the production floor",
      ],
    },
    {
      id: "nell-farrow",
      name: "Nell Farrow",
      role: "The Crime Reporter",
      relationshipToVictim: "Co-wrote the story that was pulled",
      statement:
        "Three months of my life went into that piece. Why would I kill the only person in this building who wanted it printed?",
      alibi: {
        id: "np-alibi-nell",
        claim: "In the copy phone room, on to the printers about the late change. Quarter to one until just after.",
        placeId: "np-phone-room",
        from: 45,
        to: 62,
        corroboratedBy: ["the-printers"],
      },
      suspiciousDetails: [
        "Had a furious row with Bellamy that evening over whose byline led the piece",
        "Was the only reporter trusted with the source's identity",
        "Carries an editorial card, which does not open the production floor",
        "Was told the byline decision an hour before the editor died",
      ],
    },
    {
      id: "vikram-rao",
      name: "Vikram Rao",
      role: "The Chief Subeditor",
      relationshipToVictim: "Thirty-one years on the paper, nine of them under her",
      statement:
        "I put the paper to bed every night for thirty-one years. Last night I put it to bed and went home, and that is the whole of what I did.",
      alibi: {
        id: "np-alibi-vikram",
        claim: "On the stone until the second edition was away, then straight out.",
        placeId: "np-stone",
        from: 0,
        to: 90,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Has worked on the stone for thirty-one years and can remake a page alone",
        "His pension vests next year and is tied to the paper continuing to trade",
        "Handles every page proof before it is plated, including the investigations",
        "Was the only person on the production floor after the first edition went",
      ],
    },
    {
      id: "harriet-slade",
      name: "Harriet Slade",
      role: "The Proprietor's Daughter",
      relationshipToVictim: "Sat on the board that employed her",
      statement:
        "My father's reputation was going to be taken apart in his own newspaper. I came to ask her not to run it. Asking is not the same as anything else.",
      alibi: {
        id: "np-alibi-harriet",
        claim: "I was in the newsroom with her until about half twelve, then I left.",
        placeId: "np-newsroom",
        from: 0,
        to: 40,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "The story would have ended her father publicly and the paper commercially",
        "Was in the building, by her own account, later than anyone outside the staff",
        "Holds a visitor card, which opens the front entrance and nothing else",
        "Admits she asked the editor to pull the story and was refused",
      ],
    },
  ],
  evidence: [
    {
      id: "the-spike",
      title: "The Copy Spike",
      description:
        "The steel spike Bellamy kept beside her typewriter, of the kind every desk in the building once had. It was to hand, and whoever used it did not bring anything of their own. There are no prints on it that should not be there — everyone in the newsroom had touched it at some point over nine years.",
      category: "physical",
      mentionsSuspectIds: [],
      unlockStage: 1,
      observedAt: 45,
    },
    {
      id: "page-plan",
      title: "The Page One Plan",
      description:
        "The plan for the second edition's front page, initialled at 11:40 PM by the duty editor. The lead is the investigation, six columns. Written across it in a different hand, at 12:52 AM: PULLED — SET FLOWER SHOW. A page cannot be changed at that hour without being remade by hand on the stone.",
      category: "document",
      mentionsSuspectIds: ["douglas-kerr"],
      unlockStage: 1,
      observedAt: 52,
    },
    {
      id: "swipe-log",
      title: "Building Access Log",
      description:
        "After midnight the front entrance requires a card. Four are used to enter that night and the log records every exit. One card leaves the building at 12:40 AM and does not return. One visitor card leaves at 12:41 AM and does not return. The remaining two do not leave until after the alarm is set.",
      category: "digital",
      mentionsSuspectIds: ["douglas-kerr", "harriet-slade"],
      unlockStage: 2,
      observedAt: 40,
    },
    {
      id: "printers-call",
      title: "Call to the Printers",
      description:
        "The copy phone room's line to the print works was open from 12:45 AM to 1:02 AM — seventeen minutes, logged at both ends, about a late change to an inside page. The foreman at the works remembers the conversation and who he was having it with.",
      category: "digital",
      mentionsSuspectIds: ["nell-farrow"],
      unlockStage: 2,
      observedAt: 62,
    },
    {
      id: "production-door",
      title: "The Production Floor Door",
      description:
        "The door to the stone is on a separate system from the rest of the building and admits production staff only. Editorial cards do not open it; visitor cards do not open it. Its log shows one card in use on the stone through the whole of the relevant period, and no others at all.",
      category: "digital",
      mentionsSuspectIds: ["harriet-slade", "vikram-rao"],
      unlockStage: 3,
      observedAt: 52,
    },
    {
      id: "advance-proofs",
      title: "The Advance Proofs",
      description:
        "In the locked drawer of Bellamy's desk, a folder of page proofs from investigations run over the past six years — every one of them stamped by the subs' desk before publication, and every one of them matching a copy found in the proprietor's own papers. Somebody inside production had been handing them over before they ran.",
      category: "document",
      mentionsSuspectIds: ["harriet-slade", "vikram-rao"],
      unlockStage: 3,
    },
    {
      id: "final-note",
      title: "The Last Page of Her Notebook",
      description:
        "Bellamy's shorthand, the final entry, timed 11:55 PM: 'Told H. it runs. Told D. it runs. Nell has the byline. Have told the leak I know — will name in the second edition unless he resigns tonight.' The pronoun is unambiguous and only one of the four people she spoke to that night is described anywhere in her notes as working on production.",
      category: "document",
      mentionsSuspectIds: ["nell-farrow", "douglas-kerr"],
      unlockStage: 4,
    },
  ],
  timeline: [
    {
      id: "np-t-000",
      t: 0,
      time: "12:00 AM",
      event: "The first edition goes to the print works.",
      placeId: "np-stone",
    },
    {
      id: "np-t-031",
      t: 31,
      time: "12:31 AM",
      event: "Iris Bellamy takes a call at her desk. It is the last time she is heard.",
      placeId: "np-newsroom",
    },
    {
      id: "np-t-040",
      t: 40,
      time: "12:40 AM",
      event: "A staff card is used to leave by the front entrance.",
      placeId: "np-front-door",
    },
    {
      id: "np-t-041",
      t: 41,
      time: "12:41 AM",
      event: "A visitor card is used to leave by the front entrance.",
      placeId: "np-front-door",
    },
    {
      id: "np-t-052",
      t: 52,
      time: "12:52 AM",
      event: "Page one is remade on the stone. The lead story is pulled.",
      placeId: "np-stone",
    },
    {
      id: "np-t-062",
      t: 62,
      time: "1:02 AM",
      event: "The line to the print works closes.",
      placeId: "np-phone-room",
    },
    {
      id: "np-t-100",
      t: 100,
      time: "1:40 AM",
      event: "The night cleaner finds Bellamy at her desk.",
      placeId: "np-newsroom",
    },
  ],
  hintCount: 5,
};
