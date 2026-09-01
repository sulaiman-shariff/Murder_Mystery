"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * The file-folder tabs across the top of the case.
 *
 * Keyboard users get arrow-key navigation, the active tab scrolls itself into
 * view on a narrow screen, and every target clears 44px — the old bar was
 * roughly 23px tall, on the primary navigation of the whole app.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [active]);

  function handleKeyDown(event: React.KeyboardEvent) {
    const direction =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;

    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    onChange(next.id);
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Case sections"
      onKeyDown={handleKeyDown}
      className={cn(
        "scroll-region flex gap-1 overflow-x-auto px-3 pb-2",
        // Hide the scrollbar; the fading edge is the affordance.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : undefined}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-t border-b-2 px-3.5 py-2",
              "font-display text-[13px] uppercase tracking-[0.12em] transition-colors",
              isActive
                ? "border-accent bg-ink-700 text-paper"
                : "border-transparent text-text-muted hover:bg-ink-800 hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
