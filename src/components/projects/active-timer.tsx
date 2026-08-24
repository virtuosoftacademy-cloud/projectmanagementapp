"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logTimeAction } from "@/lib/actions";
import { TODAY } from "@/lib/domain";

function format(seconds: number) {
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  return parts.map((part) => part.toString().padStart(2, "0")).join(":");
}

/**
 * Stopwatch for the current user.
 *
 * Stopping writes a real time entry through `logTimeAction` — the same action
 * the manual "Log Time" dialog uses, so a tracked session and a typed one land
 * identically. It used to just zero the counter, which meant the timer looked
 * like it worked and silently threw the time away.
 *
 * Entries are dated `TODAY` to match the manual dialog's default: this app runs
 * on a fixed demo clock, and using the real wall date would file tracked time
 * outside the week every other screen displays.
 */
export function ActiveTimer({
  userName,
  tasks,
}: {
  userName: string;
  tasks: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running]);

  function stop() {
    setRunning(false);

    // The schema's floor is one minute, so anything shorter has nothing
    // meaningful to record — say so rather than failing validation.
    const minutes = Math.round(seconds / 60);
    if (!taskId || minutes < 1) {
      setSeconds(0);
      setNotice(
        minutes < 1 && seconds > 0 ? "Under a minute — nothing logged." : null,
      );
      return;
    }

    startSaving(async () => {
      const result = await logTimeAction({
        taskId,
        minutes,
        date: TODAY,
        note: "Tracked with the timer",
      });

      if (!result.ok) {
        // Keep the elapsed time on screen so a failure does not lose the work.
        setNotice(result.error ?? "Could not save that time.");
        return;
      }

      setSeconds(0);
      setNotice(`Logged ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`);
      router.refresh();
    });
  }

  return (
    <Card className="border-2 border-primary/20 shadow-none">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold">Active Timer</h2>
          <p className="text-xs text-muted-foreground">Tracking as {userName}</p>
        </div>

        <select
          value={taskId}
          onChange={(event) => setTaskId(event.target.value)}
          aria-label="Task to track"
          className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select a task to track...</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.label}
            </option>
          ))}
        </select>

        <p className="text-center font-mono text-4xl font-bold tracking-wider">
          {format(seconds)}
        </p>

        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            disabled={!taskId || saving}
            onClick={() => setRunning((value) => !value)}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="sm" disabled={!seconds || saving} onClick={stop}>
            <Square className="h-4 w-4" />
            {saving ? "Saving…" : "Stop & log"}
          </Button>
        </div>

        {notice ? (
          <p role="status" className="text-center text-xs text-muted-foreground">
            {notice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
