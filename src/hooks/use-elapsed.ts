"use client";

import { useEffect, useState } from "react";
import { secondsSince } from "@/lib/duration";

/**
 * Seconds elapsed since `startedAt`, re-read once a second.
 *
 * The number is always *derived* from the timestamp, never accumulated: an
 * interval that misses ticks — a backgrounded tab throttles to once a minute,
 * a sleeping laptop stops entirely — would otherwise drift further behind the
 * longer it ran. Recomputing means the display is correct the moment the tab
 * comes back, and correct after a refresh, because the truth lives in the
 * timestamp rather than in this component.
 *
 * Starts at zero rather than at the real elapsed time so the server render and
 * the first client render agree; the first sample lands a tick later.
 */
export function useElapsed(startedAt: string | null, pausedAt: string | null = null) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    // Paused: the number is fixed, so read it once and stop ticking.
    if (pausedAt) {
      const frozen = Math.max(
        0,
        Math.floor((new Date(pausedAt).getTime() - new Date(startedAt).getTime()) / 1000),
      );
      const once = setTimeout(() => setSeconds(frozen), 0);
      return () => clearTimeout(once);
    }

    const sample = () => setSeconds(secondsSince(startedAt));
    // The first sample is scheduled rather than taken in the effect body: this
    // subscribes to the clock, and reading it synchronously here would be a
    // cascading render (and is what `react-hooks/set-state-in-effect` objects
    // to). A zero-delay timeout puts it in the next task instead, so the
    // correct value appears immediately without an extra render pass inside
    // the commit.
    const first = setTimeout(sample, 0);
    const id = setInterval(sample, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [startedAt, pausedAt]);

  // Guarded rather than reset in the effect, so a timer that stops reads zero
  // on the very next render instead of briefly showing its last value.
  return startedAt ? seconds : 0;
}
