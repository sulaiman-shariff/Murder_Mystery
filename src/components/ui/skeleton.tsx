import { cn } from "@/lib/cn";

/**
 * One loading language for the whole app. Previously four different
 * treatments appeared ("Loading...", a pulsing sentence, two Suspense
 * fallbacks), and each one shifted the layout when the real content landed.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-ink-600", className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-border-dark bg-ink-800 p-4">
      <Skeleton className="mb-3 h-3 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-500 border-t-accent" />
      <p className="font-display text-xs uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
    </div>
  );
}
