import type { Mystery } from "@/types";

/**
 * Case 2 — engine: time-window placement.
 *
 * A theatre in performance keeps objective records of where everyone was:
 * the cue sheet, the lighting board, the box-office till roll. Three suspects
 * are accounted for by a machine or a document. The fourth is the one person
 * in the building who is required to be there and is never given a station.
 *
 * Case clock: t is minutes from curtain up at 7:30 PM.
 */
export const vaughnStreet: Mystery = {
  id: "vaughn-street",
  order: 2,
  title: "The Vaughn Street Theatre",
  subtitle: "Between the Acts",
  victim: {
    name: "Roland Pike",
    role: "Stage manager",
    age: 51,
    description:
      "Twenty-two years at the Vaughn Street, and he ran it like a signal box — every cue, every entrance, every late call written down and remembered. Found in the prompt corner after the curtain came down on Act II, struck once with a length of iron from the counterweight rail.",
  },
  introduction:
    "The house was full, the play ran to time, and nobody in the audience knew anything was wrong. Roland Pike called the first cue of Act II at twenty-five to nine and was never heard on the headset again. The company kept going without him — a theatre in performance is a machine, and machines leave records. Every station in this building writes down where its operator was. Find the one that doesn't.",
  places: [
    { id: "vs-prompt-corner", name: "The Prompt Corner" },
    { id: "vs-stage", name: "The Stage" },
    { id: "vs-lighting-box", name: "The Lighting Box" },
    { id: "vs-box-office", name: "The Box Office" },
    { id: "vs-dressing-rooms", name: "The Dressing Rooms" },
    { id: "vs-stage-door", name: "The Stage Door" },
  ],
  storySections: [
    {
      id: "the-house",
      title: "The Vaughn Street",
      content:
        "Eight hundred seats, a raked stage, and a counterweight system that has not been rebuilt since the war. The company is small and has worked together a long time, which is another way of saying they have had a long time to get sick of one another. Tonight was the fourth performance of a six-week run.",
    },
    {
      id: "the-corner",
      title: "The Prompt Corner",
      content:
        "The prompt corner sits stage left, behind the black. It is where the stage manager stands for the whole of every performance, headset on, marked script open on the desk in front of him. From there he can see the stage and be seen by almost nobody. It is reachable only from the wings, and the wings are not a place an audience member can get to.",
    },
    {
      id: "how-a-show-runs",
      title: "How a Show Runs",
      content:
        "Everyone working a performance has a station and a record. The stage manager calls cues from the prompt corner and marks them in the book. The operator in the lighting box works a board that logs every cue it is given, with a timestamp. The box office keeps a till roll. The actors are on stage or they are not, and the cue sheet says which. The one exception is the understudy: required in the building for every performance, made up and dressed, and given nothing to do unless somebody falls ill.",
    },
  ],
  suspects: [
    {
      id: "celia-wren",
      name: "Celia Wren",
      role: "The Leading Actress",
      relationshipToVictim: "Fifteen years in the same company",
      statement:
        "Roland and I shouted at each other twice a week for fifteen years. That was the working relationship. I'd have been lost without him and he knew it.",
      alibi: {
        id: "vs-alibi-celia",
        claim: "On stage. I don't leave it in the second act until the scene change.",
        placeId: "vs-stage",
        from: 68,
        to: 92,
        corroboratedBy: ["the-audience"],
      },
      suspiciousDetails: [
        "Had a loud public row with Pike at the Act I interval",
        "Pike had put in writing that she was 'unreliable before a house'",
        "Wears full stage makeup from the half-hour call",
        "Has more to lose from a bad season than anyone in the company",
      ],
    },
    {
      id: "tobias-frayne",
      name: "Tobias Frayne",
      role: "The Understudy",
      relationshipToVictim: "Six years under Pike's management",
      statement:
        "I was in the building. I'm always in the building. That's the job — you sit made up in a cold room in case somebody twists an ankle, and then you go home.",
      alibi: {
        id: "vs-alibi-tobias",
        claim: "In the number two dressing room, where I sit every night.",
        placeId: "vs-dressing-rooms",
        from: 0,
        to: 110,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Has understudied the same part for six years and gone on twice",
        "Makes up in full for every performance, as understudies are required to",
        "Is the only person working the show who is given no station and keeps no record",
        "Was told something at the interval that he has not repeated to anyone",
      ],
    },
    {
      id: "marta-devlin",
      name: "Marta Devlin",
      role: "The Lighting Operator",
      relationshipToVictim: "Three years working to Pike's cues",
      statement:
        "He reported me. In writing, to the board. I've not had a drink in nine months and he knew that too, and he reported me anyway.",
      alibi: {
        id: "vs-alibi-marta",
        claim: "In the lighting box. I can't leave it during an act — the board doesn't run itself.",
        placeId: "vs-lighting-box",
        from: 65,
        to: 110,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Pike reported her to the board for drinking on a performance",
        "The lighting box is the only room backstage that locks from the inside",
        "Was heard saying the report would 'finish her in this town'",
        "Wears a headset on the same channel as the prompt corner",
      ],
    },
    {
      id: "rufus-bell",
      name: "Rufus Bell",
      role: "The Producer",
      relationshipToVictim: "Employed Pike for twenty-two years",
      statement:
        "Roland ran my theatre better than I do. I'm aware of how that sounds, given he was about to make my life extremely difficult.",
      alibi: {
        id: "vs-alibi-rufus",
        claim: "At the returns window in the box office. We had a queue until nearly nine.",
        placeId: "vs-box-office",
        from: 45,
        to: 88,
        corroboratedBy: ["front-of-house"],
      },
      suspiciousDetails: [
        "Pike had found discrepancies in two seasons of box-office returns",
        "Draws up the company list for the following season himself",
        "Stood to lose the theatre if Pike took what he had found to the board",
        "Was seen at the interval putting a folded paper into Pike's hand",
      ],
    },
  ],
  evidence: [
    {
      id: "iron-brace",
      title: "The Iron Brace",
      description:
        "A two-foot length of iron from the counterweight rail, found under the prompt desk. It is kept in the wings and anyone backstage could lift it. Along the grip is a smear of greasepaint — theatrical Number Five, the shade the company uses for men.",
      category: "physical",
      mentionsSuspectIds: [],
      unlockStage: 1,
      observedAt: 80,
    },
    {
      id: "cue-sheet",
      title: "The Marked Script",
      description:
        "Pike's own book, open on the prompt desk. Cues are marked in pencil up to the top of Act II and then stop mid-page. The scene breakdown on the facing page records who is on stage in each scene, and for the whole of the second act's opening scene the stage holds two actors and does not release either of them until the change at nine.",
      category: "document",
      mentionsSuspectIds: ["celia-wren", "tobias-frayne"],
      unlockStage: 1,
      observedAt: 68,
    },
    {
      id: "lighting-log",
      title: "Lighting Board Log",
      description:
        "The board writes down every cue it is given, to the second. Cues run through the second act at 8:38, 8:47, 8:52 and 9:01 — each one taken manually at the desk, which is four floors of stairs and a locked door away from the wings.",
      category: "digital",
      mentionsSuspectIds: ["marta-devlin"],
      unlockStage: 2,
      observedAt: 82,
    },
    {
      id: "box-office-roll",
      title: "Box Office Till Roll",
      description:
        "The returns window sold eleven tickets after the interval, the last of them stamped 8:58 PM. The window faces the street and is behind a locked door from the auditorium; whoever worked it could not have been anywhere else.",
      category: "document",
      mentionsSuspectIds: ["rufus-bell"],
      unlockStage: 2,
      observedAt: 88,
    },
    {
      id: "headset-channel",
      title: "The Dead Channel",
      description:
        "The prompt-corner headset was found switched off at the belt pack. The lighting operator reports the channel went dead at about a quarter to nine and that she assumed the pack had failed, as it had twice that week.",
      category: "physical",
      mentionsSuspectIds: ["marta-devlin"],
      unlockStage: 3,
      observedAt: 74,
    },
    {
      id: "next-season-list",
      title: "Next Season's Company",
      description:
        "A folded sheet in Pike's jacket pocket, drawn up in the producer's hand: the list of players engaged for the following season. It is one name shorter than this year's company. The name that is missing has been on every list for six years.",
      category: "document",
      mentionsSuspectIds: ["rufus-bell", "celia-wren"],
      unlockStage: 3,
    },
    {
      id: "stage-door-book",
      title: "The Stage Door Book",
      description:
        "Everyone working a performance signs in on arrival and out on leaving, and the doorman does not let that slide. Between the half-hour call and the curtain coming down on Act II, nobody signed out. Whoever did this was still in the building when the audience applauded.",
      category: "document",
      mentionsSuspectIds: ["tobias-frayne", "rufus-bell"],
      unlockStage: 4,
    },
  ],
  timeline: [
    {
      id: "vs-t-000",
      t: 0,
      time: "7:30 PM",
      event: "Curtain up on Act I.",
      placeId: "vs-stage",
    },
    {
      id: "vs-t-045",
      t: 45,
      time: "8:15 PM",
      event: "Act I ends. The interval bell rings and the bars open.",
      placeId: "vs-stage",
    },
    {
      id: "vs-t-055",
      t: 55,
      time: "8:25 PM",
      event: "A folded paper changes hands in the wings during the interval.",
      placeId: "vs-prompt-corner",
    },
    {
      id: "vs-t-065",
      t: 65,
      time: "8:35 PM",
      event: "Act II begins. Pike calls the opening cue from the prompt corner.",
      placeId: "vs-prompt-corner",
    },
    {
      id: "vs-t-074",
      t: 74,
      time: "8:44 PM",
      event: "The prompt-corner headset channel goes dead.",
      placeId: "vs-prompt-corner",
    },
    {
      id: "vs-t-110",
      t: 110,
      time: "9:20 PM",
      event: "Curtain down on Act II. The prompt corner is found unattended.",
      placeId: "vs-prompt-corner",
    },
    {
      id: "vs-t-115",
      t: 115,
      time: "9:25 PM",
      event: "Pike is found behind the black, below the prompt desk.",
      placeId: "vs-prompt-corner",
    },
  ],
  hintCount: 5,
};
