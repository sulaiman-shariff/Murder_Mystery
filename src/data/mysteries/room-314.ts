import type { Mystery } from "@/types";

/**
 * Case 1 — teaches the loop. Engine: access control.
 *
 * Everyone has a motive; only two people could have opened the door. The key
 * register clears one of them. That is the whole spine, and it is three joins
 * deep on purpose — this is the case that shows players what the game wants.
 *
 * No clue names the killer. The join is always observation (here) plus an
 * identifying attribute on a suspect card.
 *
 * Case clock: t is minutes from 9:00 PM.
 */
export const room314: Mystery = {
  id: "room-314",
  order: 1,
  title: "Room 314, The Ashcombe",
  subtitle: "A Debt Called In",
  victim: {
    name: "Victor Sallow",
    role: "Private lender",
    age: 58,
    description:
      "A man who made his living on other people's bad months. Softly spoken, immaculately dressed, and owed money by half the people under this roof. Found on the floor of his room, struck once from behind with the brass paperweight from his own desk.",
  },
  introduction:
    "The Ashcombe is a grand hotel in its off-season: eleven guests, a skeleton staff, and rain against the glass since Thursday. At half past ten the turndown maid found the door of Room 314 standing open. Victor Sallow was lying between the bed and the writing desk, and the house has been very quiet ever since. The doors here keep their own records — that is where you will want to begin.",
  places: [
    { id: "as-lobby", name: "The Lobby" },
    { id: "as-bar", name: "The Bar" },
    { id: "as-office", name: "The Manager's Office" },
    { id: "as-third-floor", name: "The Third-Floor Corridor" },
    { id: "as-314", name: "Room 314" },
    { id: "as-318", name: "Room 318" },
  ],
  storySections: [
    {
      id: "the-house",
      title: "The House in the Rain",
      content:
        "The Ashcombe was built for a busier century. Out of season the corridors run long and empty, the radiators tick, and sound carries further than anyone staying here would like. Eleven guests are signed in. Three members of staff are on duty tonight: the manager, the night porter, and a barman who goes home at eleven. Everyone knows everyone's business, and tonight everyone would rather they didn't.",
    },
    {
      id: "the-room",
      title: "Room 314",
      content:
        "Room 314 faces the back of the building. The writing desk sits under the window, its chair pushed out and turned, as though Sallow had risen to greet whoever came in. There is no damage to the door and no sign of a struggle beyond the chair. His wallet is on the nightstand, untouched, with forty pounds in it. Whoever came here did not come for money — or already had what they wanted.",
    },
    {
      id: "the-doors",
      title: "How the Doors Work",
      content:
        "Every door in the Ashcombe was fitted with electronic locks four years ago, and every lock keeps a log: the time, and which card opened it. Guest cards open one room. Staff master cards open all of them, and there are exactly two in the building — one held by the manager, one by the night porter. When a master card is not in use it is signed into the office safe, and the register beside the safe is signed by hand.",
    },
  ],
  suspects: [
    {
      id: "marguerite-ash",
      name: "Marguerite Ash",
      role: "The Manager",
      relationshipToVictim: "Sallow had stayed here every winter for nine years",
      statement:
        "He was a guest. A good one, in the sense that he paid. I don't have to have liked him to be sorry about it.",
      alibi: {
        id: "as-alibi-marguerite",
        claim: "I was in my office doing the night's accounts, from nine until the alarm.",
        placeId: "as-office",
        from: 0,
        to: 90,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Carries one of the two master cards in the building",
        "The hotel's accounts have been in trouble for three years",
        "Was noticeably short with Sallow at dinner on Thursday",
        "Signs the key register herself, in her own hand",
      ],
    },
    {
      id: "piers-landon",
      name: "Piers Landon",
      role: "The Debtor",
      relationshipToVictim: "Owed Sallow a sum he would not name",
      statement:
        "Yes, I owed him. Half this county owes somebody. That doesn't make me a murderer, it makes me ordinary.",
      alibi: {
        id: "as-alibi-piers",
        claim: "I was in the bar from nine until they threw me out at quarter past ten.",
        placeId: "as-bar",
        from: 0,
        to: 75,
        corroboratedBy: ["bar-staff"],
      },
      suspiciousDetails: [
        "His name appears in Sallow's ledger, not struck through",
        "Has a guest card for Room 212 and no other key",
        "Was heard telling the barman he would 'sort it tonight, one way or another'",
        "Drinks steadily and remembers less than he claims",
      ],
    },
    {
      id: "dinah-coyle",
      name: "Dinah Coyle",
      role: "The Night Porter",
      relationshipToVictim: "Says she had never spoken to him",
      statement:
        "I work nights. I see everyone and nobody sees me. I was at the desk. That's where I always am.",
      alibi: {
        id: "as-alibi-dinah",
        claim: "At the front desk in the lobby, the whole night, same as every night.",
        placeId: "as-lobby",
        from: 0,
        to: 90,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Carries the second master card in the building",
        "Took this job eleven months ago, shortly after her family lost their house",
        "Her mother's maiden name was Ellery",
        "Is the only member of staff with no one to vouch for her after nine",
      ],
    },
    {
      id: "hugo-vance",
      name: "Hugo Vance",
      role: "The Partner",
      relationshipToVictim: "Business partner of eleven years",
      statement:
        "We argued. We argued for eleven years — it was how the business worked. You don't kill a man over an argument you've had a thousand times.",
      alibi: {
        id: "as-alibi-hugo",
        claim: "In my room, 318. I'd taken something to help me sleep and it did its job.",
        placeId: "as-318",
        from: 20,
        to: 90,
        corroboratedBy: [],
      },
      suspiciousDetails: [
        "Had a public argument with Sallow in the bar on Friday",
        "Stands to take sole control of the lending business",
        "Gave Sallow the brass paperweight as a gift some years ago",
        "Holds a guest card for Room 318 and no other key",
      ],
    },
  ],
  evidence: [
    {
      id: "the-paperweight",
      title: "The Brass Paperweight",
      description:
        "A heavy brass paperweight, engraved on the base with a date eleven years old. It sat on Sallow's own desk. One blow, from behind, by someone he had turned his back on. Nobody brought a weapon to this room.",
      category: "physical",
      mentionsSuspectIds: ["hugo-vance"],
      unlockStage: 1,
      observedAt: 47,
    },
    {
      id: "door-log",
      title: "Door Log, Room 314",
      description:
        "The electronic lock's audit trail for the evening. Sallow's own card opens the door at 9:22 PM. The door is then opened once more, at 9:47 PM — not by a guest card, but by a staff master card. It is not opened again until the maid's card at 10:30.",
      category: "digital",
      mentionsSuspectIds: [],
      unlockStage: 1,
      observedAt: 47,
    },
    {
      id: "key-register",
      title: "The Key Register",
      description:
        "The handwritten book beside the office safe. Both master cards are signed out at the start of the evening shift. One is signed back into the safe at 9:10 PM and not signed out again that night; the ink and the hand match the rest of the manager's entries. The second master card has no return entry at all.",
      category: "document",
      mentionsSuspectIds: ["marguerite-ash", "dinah-coyle"],
      unlockStage: 2,
      observedAt: 10,
    },
    {
      id: "bar-tab",
      title: "The Closed Bar Tab",
      description:
        "A bar tab opened at 8:40 PM and settled at 10:15 PM. The barman is certain about the times because he was waiting to go home, and equally certain the customer did not leave the room in between — the bar has one door and it is behind the counter he stood at all night.",
      category: "statement",
      mentionsSuspectIds: ["piers-landon"],
      unlockStage: 2,
      observedAt: 75,
    },
    {
      id: "debt-ledger",
      title: "Sallow's Ledger",
      description:
        "A slim book of private loans kept in the victim's case. Three current debts are listed by name. A fourth entry, eleven months old, has been struck through and marked 'settled — property surrendered.' The borrower's name there is Ellery.",
      category: "document",
      mentionsSuspectIds: ["piers-landon", "hugo-vance"],
      unlockStage: 3,
    },
    {
      id: "house-phone-log",
      title: "House Telephone Log",
      description:
        "The switchboard records every call placed from or to the lobby desk. Between 9:30 and 10:05 PM there are no calls at all — the longest silent stretch of the night. The desk bell was rung twice in that window by a guest wanting ice, and went unanswered.",
      category: "digital",
      mentionsSuspectIds: ["dinah-coyle", "marguerite-ash"],
      unlockStage: 3,
      observedAt: 40,
    },
    {
      id: "pawn-ticket",
      title: "A Pawn Ticket",
      description:
        "Folded into the back of Sallow's wallet, a pawnbroker's ticket for a gold locket, dated eleven months ago. The ticket has never been redeemed. The surrendering name on it is Ellery.",
      category: "document",
      mentionsSuspectIds: ["dinah-coyle", "marguerite-ash"],
      unlockStage: 4,
    },
  ],
  timeline: [
    {
      id: "as-t-000",
      t: 0,
      time: "9:00 PM",
      event: "The kitchen closes. The lobby is quiet and the rain is loud.",
      placeId: "as-lobby",
    },
    {
      id: "as-t-010",
      t: 10,
      time: "9:10 PM",
      event: "A master card is signed back into the office safe.",
      placeId: "as-office",
    },
    {
      id: "as-t-022",
      t: 22,
      time: "9:22 PM",
      event: "Sallow returns to his room and lets himself in with his own card.",
      placeId: "as-314",
    },
    {
      id: "as-t-040",
      t: 40,
      time: "9:40 PM",
      event: "A guest on the third floor rings the lobby desk for ice. Nobody answers.",
      placeId: "as-third-floor",
    },
    {
      id: "as-t-047",
      t: 47,
      time: "9:47 PM",
      event: "The lock on Room 314 records an entry made with a staff master card.",
      placeId: "as-314",
    },
    {
      id: "as-t-075",
      t: 75,
      time: "10:15 PM",
      event: "Piers Landon settles his tab and is walked out of the bar.",
      placeId: "as-bar",
      relatedSuspectId: "piers-landon",
    },
    {
      id: "as-t-090",
      t: 90,
      time: "10:30 PM",
      event: "The turndown maid finds the door of 314 standing open.",
      placeId: "as-314",
    },
  ],
  hintCount: 5,
};
