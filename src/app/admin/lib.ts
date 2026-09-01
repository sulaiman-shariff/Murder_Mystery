"use client";

export const MYSTERY_NAMES: Record<string, string> = {
  "room-314": "Room 314, The Ashcombe",
  "vaughn-street": "The Vaughn Street Theatre",
  "northolt-press": "The Northolt Press",
};

export const MYSTERY_IDS = Object.keys(MYSTERY_NAMES);

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

export const AI_TYPE_LABELS: Record<string, string> = {
  murderer_validation: "Murderer",
  motive_validation: "Motive",
  hint: "Hint",
  detective_chat: "Chat",
};

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest
    .toString()
    .padStart(2, "0")}`;
}

/** Thrown when the admin cookie has expired or was never set. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Admin session expired");
    this.name = "UnauthorizedError";
  }
}

/**
 * One fetch wrapper for every admin call.
 *
 * Each handler used to repeat the same `if (res.status === 401)` check, and
 * several swallowed their errors entirely, so a failed load looked identical
 * to an empty result. Here a 401 raises UnauthorizedError for the page to
 * catch once, and everything else throws with the server's own message.
 */
export async function authedFetch<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  if (res.status === 401) throw new UnauthorizedError();

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Response had no JSON body; the status message stands.
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
