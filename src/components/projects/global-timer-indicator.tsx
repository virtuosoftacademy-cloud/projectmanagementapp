"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useElapsed } from "@/hooks/use-elapsed";
import { formatClock } from "@/lib/duration";
import { stopTimerAction } from "@/lib/task-actions";
import type { RunningTimer } from "@/lib/domain";

/**
 * The running timer, in the app header.
 *
 * Rendered on every page so a timer left running is visible from wherever the
 * person wandered off to — the failure mode this prevents is a timer running
 * all night on a task nobody is looking at. Stopping is one click from here,
 * and the task title links back to where it came from.
 */
export function GlobalTimerIndicator({ running }: { running: RunningTimer | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const elapsed = useElapsed(running?.startedAt ?? null);

  if (!running) return null;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border bg-success/10 py-1 pl-3 pr-1 text-sm">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>

      <span className="font-mono tabular-nums" aria-hidden>
        {formatClock(elapsed)}
      </span>

      <Link
        href={`/projects/project/${running.projectId}/tasks/${running.taskId}`}
        className="hidden max-w-[16rem] truncate text-muted-foreground hover:text-foreground sm:block"
      >
        {running.taskTitle}
      </Link>

      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={`Stop the timer on ${running.taskTitle}`}
        onClick={() =>
          startTransition(async () => {
            const result = await stopTimerAction();
            setNotice(result.error ?? "Timer stopped and logged.");
            if (result.ok) router.refresh();
          })
        }
      >
        <Square className="h-3.5 w-3.5" />
      </Button>

      {/* The clock itself is aria-hidden — announcing it every second would be
          unusable — so this carries the state change instead. */}
      <span role="status" aria-live="polite" className="sr-only">
        {notice ?? `Timer running on ${running.taskTitle}.`}
      </span>
    </div>
  );
}
