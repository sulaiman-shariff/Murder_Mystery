"use client";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-light hover:border-accent-light active:bg-accent-dark",
  secondary:
    "bg-ink-700 text-text-primary border border-ink-500 hover:bg-ink-600 hover:border-ink-400 active:bg-ink-800",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:bg-ink-700 hover:text-text-primary active:bg-ink-800",
  danger:
    "bg-transparent text-error border border-error/40 hover:bg-error/15 hover:border-error active:bg-error/25",
  gold:
    "bg-transparent text-gold border border-gold/50 hover:bg-gold/15 hover:border-gold active:bg-gold/25",
};

// Every size clears the 44px touch minimum. `sm` is compact horizontally,
// not vertically — shrinking the tap target was the old mistake.
const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 py-2 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-medium",
        "font-sans tracking-wide transition-all duration-150",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className={cn(
            "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
            size === "sm" ? "h-3 w-3" : "h-4 w-4"
          )}
        />
      )}
      {children}
    </button>
  );
}
