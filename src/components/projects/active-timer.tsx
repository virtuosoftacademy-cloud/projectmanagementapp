"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function format(seconds: number) {
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  return parts.map((part) => part.toString().padStart(2, "0")).join(":");
}

/** Stopwatch for the current user. Local to the session — nothing is persisted. */
export function ActiveTimer({
  userName,
  tasks,
}: {
  userName: string;
  tasks: { id: string; label: string }[];
}) {
  const [taskId, setTaskId] = useState("");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
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
    setSeconds(0);
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
            disabled={!taskId}
            onClick={() => setRunning((value) => !value)}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="sm" disabled={!seconds} onClick={stop}>
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
