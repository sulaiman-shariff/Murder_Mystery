"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeam } from "@/lib/storage/local";

interface Reveal {
  murderer: string;
  murdererDescription: string;
  motiveSummary: string;
  explanation: string;
}

/**
 * Fetches the solution from the server once the case is over.
 *
 * The solution is deliberately not in the client bundle — this component is
 * the only place it reaches the browser, and the API refuses unless the
 * team's session is actually finished.
 */
export function CaseSolution({ mysteryId }: { mysteryId: string }) {
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const team = getTeam();
    if (!team?.id) {
      setState("error");
      return;
    }

    let cancelled = false;

    fetch(
      `/api/mysteries/${encodeURIComponent(mysteryId)}/reveal?teamId=${encodeURIComponent(team.id)}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("unavailable");
        return res.json();
      })
      .then((data: Reveal) => {
        if (cancelled) return;
        setReveal(data);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [mysteryId]);

  if (state === "loading") {
    return (
      <Card title="The solution">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </Card>
    );
  }

  if (state === "error" || !reveal) {
    return (
      <Card title="The solution">
        <p className="text-sm leading-relaxed text-text-muted">
          The solution could not be loaded right now. Reload the page to try
          again.
        </p>
      </Card>
    );
  }

  return (
    <Card title="The solution" className="animate-rise text-left">
      <dl className="space-y-4">
        <div>
          <dt className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
            The killer
          </dt>
          <dd className="mt-1">
            <p className="font-display text-lg text-text-primary">
              {reveal.murderer}
            </p>
            <p className="text-sm text-text-secondary">
              {reveal.murdererDescription}
            </p>
          </dd>
        </div>

        <div>
          <dt className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
            The motive
          </dt>
          <dd className="mt-1 text-[15px] leading-relaxed text-text-secondary">
            {reveal.motiveSummary}
          </dd>
        </div>

        <div>
          <dt className="font-display text-[11px] uppercase tracking-[0.15em] text-text-muted">
            How it fits
          </dt>
          <dd className="mt-1 text-[15px] leading-relaxed text-text-secondary">
            {reveal.explanation}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
