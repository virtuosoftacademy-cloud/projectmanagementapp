"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useElapsed } from "@/hooks/use-elapsed";
import { formatClock } from "@/lib/duration";
import { discardTimerAction, startTimerAction, stopTimerAction } from "@/lib/task-actions";
import type { RunningTimer } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Start / stop the timer for one task.
 *
 * `running` is the viewer's timer wherever it happens to be, not just this
 * task's, so the control can say what starting here would interrupt. Only one
 * timer exists per person — starting a second stops and saves the first — and
 * showing that before the click is the difference between the rule feeling
 * deliberate and feeling like lost work.
 *
 * The elapsed figure is derived from `startedAt`, so a refresh mid-run resumes
 * at the right number instead of starting over.
 */
export function TimerControls({
  taskId,
  taskTitle,
  running,
  canLog,
  className,
}: {
  taskId: string;
  taskTitle: string;
  /** The viewer's running timer, on this task or another. */
  running: RunningTimer | null;
  /** `time.log`. Without it the controls are not rendered at all. */
  canLog: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const isThisTask = running?.taskId === taskId;
  const elapsed = useElapsed(isThisTask ? running.startedAt : null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      // `stopTimerAction` reports a discarded sub-minute run as ok-with-a-note,
      // so the message is shown either way rather than only on failure.
      if (result.error) setNotice(result.error);
      else if (done) setNotice(done);
      if (result.ok) router.refresh();
    });
  }

  if (!canLog) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {isThisTask ? (
          <>
            <span
              className="font-mono text-2xl font-bold tabular-nums"
              // Announced as it changes would be unbearable once a second; the
              // start/stop messages below carry the state change instead.
              aria-hidden
            >
              {formatClock(elapsed)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Running
            </span>

            <Button size="sm" disabled={pending} onClick={() => run(stopTimerAction, "Timer stopped and logged.")}>
              <Square className="h-4 w-4" />
              {pending ? "Stopping…" : "Stop"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(discardTimerAction, "Timer discarded — nothing logged.")}
            >
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () => startTimerAction({ taskId, note: "" }),
                running ? `Stopped ${running.taskTitle} and started ${taskTitle}.` : "Timer started.",
              )
            }
          >
            <Play className="h-4 w-4" />
            {pending ? "Starting…" : "Start timer"}
          </Button>
        )}
      </div>

      {running && !isThisTask ? (
        <p className="text-xs text-muted-foreground">
          Timing <span className="font-medium">{running.taskTitle}</span> — starting here stops
          that one and saves it.
        </p>
      ) : null}

      {/* The live region is what a screen reader gets instead of the ticking
          clock: one announcement per state change, not one per second. */}
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {notice ?? (isThisTask ? "Timer running." : "")}
      </p>
    </div>
  );
}
