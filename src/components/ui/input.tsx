"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

const fieldStyles =
  "w-full rounded border bg-ink-800 px-3 py-3 text-base text-text-primary " +
  "font-sans placeholder:text-text-muted transition-colors duration-150 " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const labelStyles =
  "font-display text-xs uppercase tracking-[0.15em] text-text-secondary";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Reserves a line under the field so validation text cannot shift layout. */
  hint?: string;
  hintTone?: "muted" | "success" | "error";
}

const hintTones = {
  muted: "text-text-muted",
  success: "text-success",
  error: "text-error",
} as const;

export function Input({
  label,
  error,
  hint,
  hintTone = "muted",
  className,
  id,
  // Default to text so the 16px rule applies and iOS does not zoom on focus.
  type = "text",
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={labelStyles}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          fieldStyles,
          error ? "border-error" : "border-border-dark",
          className
        )}
        {...props}
      />
      {/* Always rendered, so showing a message never moves the field below. */}
      <span
        id={messageId}
        className={cn(
          "min-h-4 text-xs leading-4",
          error ? hintTones.error : hintTones[hintTone]
        )}
      >
        {message}
      </span>
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className={labelStyles}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={cn(
          fieldStyles,
          "resize-none leading-relaxed",
          error ? "border-error" : "border-border-dark",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
