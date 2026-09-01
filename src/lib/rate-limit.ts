import { NextResponse } from "next/server";

/**
 * Best-effort, per-instance rate limiting.
 *
 * On Vercel each function instance keeps its own Map, so the real ceiling is
 * (instances x MAX_REQUESTS) rather than MAX_REQUESTS. That is good enough to
 * blunt a stuck retry loop or one team hammering the AI routes during an
 * event. If it ever needs to be a true global limit, back this with Upstash
 * Redis (Vercel Marketplace) and keep the same checkRateLimit signature.
 */

const store = new Map<string, { count: number; reset: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_ENTRIES = 10_000;

function pruneStore() {
  if (store.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.reset) store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  options: { max?: number } = {}
): NextResponse | null {
  const max = options.max ?? MAX_REQUESTS;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + WINDOW_MS });
    pruneStore();
    return null;
  }

  if (entry.count >= max) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  entry.count++;
  return null;
}
