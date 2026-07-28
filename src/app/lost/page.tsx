"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMysteryById } from "@/data/mystery-index";
import { useEffect, useState, Suspense } from "react";
import type { Mystery } from "@/types";

function LostContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mystery, setMystery] = useState<Mystery | null>(null);

  const mysteryId = searchParams.get("mysteryId") || "";

  useEffect(() => {
    const m = getMysteryById(mysteryId);
    setMystery(m || null);
  }, [mysteryId]);

  if (!mystery) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-5xl">⚖️</div>
        <h1 className="mb-2 text-2xl font-bold text-accent">Case Failed</h1>
        <p className="mb-8 text-sm text-text-secondary">
          You've exhausted all your attempts for{" "}
          <span className="text-text-primary">{mystery.title}</span>
        </p>

        <Card className="mb-8 border-accent/30">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">
            Case Review
          </h3>
          <div className="space-y-3 text-left text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                The Murderer Was
              </p>
              <p className="font-bold text-text-primary">
                {mystery.solution.murderer}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                The Motive
              </p>
              <p className="text-text-secondary">
                {mystery.solution.motiveSummary}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                Explanation
              </p>
              <p className="text-text-secondary leading-relaxed">
                {mystery.solution.explanation}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Button fullWidth onClick={() => router.push(`/play/${mystery.id}`)}>
            Review Evidence
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LostPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-text-muted">Loading...</p></div>}>
      <LostContent />
    </Suspense>
  );
}
