import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "default" | "accent" | "gold" | "success" | "error";

const toneStyles: Record<BadgeTone, string> = {
  default: "bg-ink-600 text-text-secondary",
  accent: "bg-accent/15 text-accent-light",
  gold: "bg-gold/15 text-gold",
  success: "bg-success/15 text-success",
  error: "bg-error/15 text-error",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5",
        "font-mono text-[11px] uppercase tracking-wider",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
