import { cn } from "@/lib/cn";

type StampTone = "accent" | "gold" | "muted";

const toneStyles: Record<StampTone, string> = {
  accent: "text-accent",
  gold: "text-gold",
  muted: "text-text-muted",
};

/**
 * The signature element: a rubber stamp pressed onto the case file.
 *
 * Used as a static file marking in headers, and — with `slam` — as the one
 * orchestrated animation in the app, on the win and lost screens.
 */
export function Stamp({
  children,
  tone = "accent",
  slam = false,
  className,
}: {
  children: React.ReactNode;
  tone?: StampTone;
  slam?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp inline-block text-sm font-bold",
        toneStyles[tone],
        slam ? "animate-stamp" : "-rotate-12",
        className
      )}
    >
      {children}
    </span>
  );
}
