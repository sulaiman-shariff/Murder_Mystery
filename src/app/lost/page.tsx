"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import { LoadingScreen } from "@/components/ui/skeleton";
import { CaseSolution } from "@/components/game/case-solution";
import { getMysteryById } from "@/data/mystery-index";
import type { Mystery } from "@/types";

function LostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mystery, setMystery] = useState<Mystery | null>(null);

  const mysteryId = searchParams.get("mysteryId") || "";

  useEffect(() => {
    setMystery(getMysteryById(mysteryId) || null);
  }, [mysteryId]);

  if (!mystery) {
    return <LoadingScreen label="Filing the case" />;
  }

  return (
    <div className="screen-pad-y flex min-h-dvh flex-col items-center overflow-x-clip px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <Stamp tone="accent" slam className="text-sm sm:text-lg">
            Case Cold
          </Stamp>
          <p className="mt-6 font-display text-sm uppercase tracking-[0.15em] text-text-muted">
            {mystery.title}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            You ran out of accusations. Here is who did it, and why.
          </p>
        </div>

        <div className="mb-6">
          <CaseSolution mysteryId={mystery.id} />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            fullWidth
            size="lg"
            onClick={() => router.push(`/play/${mystery.id}`)}
          >
            Reread the file
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => router.push("/leaderboard")}
          >
            View leaderboard
          </Button>
          <Button variant="ghost" fullWidth onClick={() => router.push("/")}>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LostPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Filing the case" />}>
      <LostContent />
    </Suspense>
  );
}
