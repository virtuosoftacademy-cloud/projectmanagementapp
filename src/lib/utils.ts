import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves Tailwind conflicts, so a `className` prop can
 * override a component's own utilities rather than fighting them. shadcn/ui
 * components assume this behaviour.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number as PKR, e.g. `Rs 11,742`. */
export function formatPkr(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-US")}`;
}

/** Formats decimal hours as `19h 20m`, dropping zero parts (`3h`, `30m`). */
export function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Initials for an avatar fallback, e.g. `Alex Chen` -> `AC`. */
export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
