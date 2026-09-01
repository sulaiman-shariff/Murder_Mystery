import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and lets later Tailwind utilities win over earlier ones.
 * Without the merge, a caller passing `p-6` to a component whose base class
 * is `p-4` would emit both and get whichever the stylesheet happened to
 * order last.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
