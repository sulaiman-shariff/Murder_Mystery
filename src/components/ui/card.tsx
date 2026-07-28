import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className = "", padded = true }: CardProps) {
  return (
    <div
      className={`
        rounded-lg border border-border-dark bg-dark-800
        ${padded ? "p-4" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
