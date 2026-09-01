"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CloseIcon } from "@/components/ui/icons";

interface SheetProps {
  title: string;
  /** Sits next to the title — an attempt counter, a hint tally. */
  meta?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Pinned below the scroll area: a submit button, a chat composer. */
  footer?: ReactNode;
  tone?: "accent" | "gold";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet on phones, a centred dialog from `sm` up.
 *
 * The three game panels previously each hand-rolled this shell and each got
 * it wrong in a different way. The shared rules that matter on a phone:
 * height is capped in `dvh` (not `vh`, which ignores browser chrome), there
 * is exactly one scroll container, the page behind is locked, and the footer
 * stays reachable when the keyboard is open.
 */
export function Sheet({
  title,
  meta,
  onClose,
  children,
  footer,
  tone = "accent",
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden",
          "rounded-t-2xl border border-border-dark bg-ink-900 shadow-sheet outline-none",
          "sm:mx-4 sm:max-w-lg sm:rounded-2xl"
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border-dark px-4 py-3">
          <h2
            className={cn(
              "font-display text-sm uppercase tracking-[0.15em]",
              tone === "gold" ? "text-gold" : "text-accent"
            )}
          >
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {meta && (
              <span className="font-mono text-xs text-text-muted">{meta}</span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded text-text-muted transition-colors hover:text-text-primary active:bg-ink-700"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* The single scroll container. Nesting another one inside this is
            what produced the old scroll traps. */}
        <div className="scroll-region min-h-0 flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {footer && (
          <div className="safe-bottom shrink-0 border-t border-border-dark bg-ink-900 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
