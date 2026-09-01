"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChevronIcon } from "@/components/ui/icons";

/**
 * An expanding section that animates its height. The grid-rows trick gives a
 * real height transition without measuring the content.
 */
export function Disclosure({
  open,
  onToggle,
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 py-1 text-left"
      >
        {summary}
        <ChevronIcon
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
