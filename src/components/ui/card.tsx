import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** A short label typed across the top of the card, like a file heading. */
  title?: string;
  /** Sits opposite the title — a count, a status, a timestamp. */
  meta?: ReactNode;
  tone?: "default" | "accent" | "gold" | "error";
}

const toneStyles = {
  default: "border-border-dark",
  accent: "border-accent/40",
  gold: "border-gold/40 bg-gold/5",
  error: "border-error/40 bg-error/5",
} as const;

export function Card({
  children,
  className,
  padded = true,
  title,
  meta,
  tone = "default",
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border bg-ink-800",
        toneStyles[tone],
        padded && "p-4",
        className
      )}
    >
      {(title || meta) && (
        <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border-dark pb-2">
          {title && (
            <h3 className="font-display text-xs uppercase tracking-[0.15em] text-gold">
              {title}
            </h3>
          )}
          {meta && (
            <span className="shrink-0 font-mono text-xs text-text-muted">
              {meta}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
