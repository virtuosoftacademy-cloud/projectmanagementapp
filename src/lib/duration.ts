/**
 * Duration and timestamp helpers, shared by server and client code.
 *
 * Elapsed time is always *derived* from timestamps rather than counted up, so
 * a running timer survives a refresh, a navigation, or being opened on another
 * device: the client only decides how often to re-render, never what the number
 * is. That is why nothing here accumulates state.
 *
 * date-fns does the calendar arithmetic — the parts that are easy to get wrong
 * around month ends, week starts and DST. Rendering stays hand-written because
 * date-fns spells durations out in words ("1 hour 24 minutes") and this app
 * shows them compactly.
 */

import {
  differenceInSeconds,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from "date-fns";

/** Monday-start, matching the weekly timesheet and `getWeekDays` in domain.ts. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/**
 * Seconds elapsed since an ISO timestamp.
 *
 * Never negative: a browser clock running behind the server's should show
 * `00:00:00` rather than count backwards.
 */
export function secondsSince(startedAt: string, now: Date = new Date()) {
  return Math.max(0, differenceInSeconds(now, parseISO(startedAt)));
}

/**
 * `HH:MM:SS`, for a live-running timer where the seconds are the point.
 *
 * Hours are not capped at 24: a timer left running overnight should read
 * `26:10:00`, not appear to have restarted. (date-fns' `intervalToDuration`
 * rolls past 24h into a `days` field, which is exactly the wrong shape here.)
 */
export function formatClock(totalSeconds: number) {
  const total = Math.max(0, Math.round(totalSeconds));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

/** `1h 24m`, dropping empty parts (`3h`, `24m`, `0m`). */
export function formatMinutes(totalMinutes: number) {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Parses the loose durations people actually type: `90`, `1.5h`, `1h 30m`,
 * `1:30`, `45m`. Returns null when nothing sensible can be read out of it,
 * which is what the Zod schema turns into a validation message.
 *
 * A bare number means minutes — the unit the rest of the app stores.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // "1:30" — hours:minutes.
  const clock = /^(\d+):([0-5]?\d)$/.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  // "1h 30m", "1.5h", "45m".
  const units = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in)?)?$/.exec(text);
  if (units && (units[1] || units[2])) {
    return Math.round(Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0));
  }

  // A bare number.
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text));

  return null;
}

/** Value for an `<input type="datetime-local">`, which wants local wall time. */
export function toLocalInput(iso: string | Date) {
  return format(typeof iso === "string" ? parseISO(iso) : iso, "yyyy-MM-dd'T'HH:mm");
}

/** `Feb 17, 09:30` — enough to place an entry without the year noise. */
export function formatStamp(iso: string) {
  return format(parseISO(iso), "MMM d, HH:mm");
}

/** `09:30`, for the second half of a same-day range. */
export function formatTime(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

/**
 * Whether a plain `yyyy-MM-dd` day is the day, or falls in the Monday-start
 * week, containing `now`.
 *
 * These take a calendar day rather than a timestamp on purpose. `TimeEntry.date`
 * is a date-only column, which comes back as midnight UTC; comparing that as an
 * *instant* against the server's local clock puts every entry on the previous
 * day for any server west of UTC. Comparing calendar days has no such seam.
 *
 * `now` is passed in rather than read here so the caller decides what "today"
 * means, and so the comparisons stay testable.
 */
export function isSameDay(day: string, now: Date) {
  return day === format(now, "yyyy-MM-dd");
}

export function isSameWeek(day: string, now: Date) {
  // `parseISO` on a date-only string yields local midnight, so this stays a
  // comparison between calendar days rather than between moments in time.
  return isWithinInterval(parseISO(day), {
    start: startOfWeek(now, WEEK_OPTIONS),
    end: endOfWeek(now, WEEK_OPTIONS),
  });
}
