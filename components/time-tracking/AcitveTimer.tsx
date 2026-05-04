import { useState } from "react";
import { useTimer, formatDuration } from "@/hooks/useTimer";
import { mockTasks, mockProjects, currentUser } from "@/app/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

interface ActiveTimerProps {
  onStop: (taskId: string, durationSeconds: number, pausedTimes: { start: string; end: string }[]) => void;
}

export function ActiveTimer({ onStop }: ActiveTimerProps) {
  const timer = useTimer();
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // Only tasks assigned to current user
  const assignedTasks = mockTasks.filter(
    (t) => t.assigneeIds.includes(currentUser.id) && t.status !== "done"
  );

  const selectedTask = mockTasks.find((t) => t.id === selectedTaskId);
  const project = selectedTask ? mockProjects.find((p) => p.id === selectedTask.projectId) : null;

  const handleStop = () => {
    timer.stop();
    if (selectedTaskId && timer.elapsedSeconds > 0) {
      onStop(selectedTaskId, timer.elapsedSeconds, timer.pausedTimes);
    }
  };

  const handleReset = () => {
    timer.reset();
  };

  return (
    <Card className="border-2 border-primary/20 shadow-none">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Active Timer</h3>
            <p className="text-xs text-muted-foreground">Tracking as {currentUser.name}</p>
          </div>
          {timer.status !== "idle" && timer.status !== "stopped" && (
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${timer.status === "running" ? "bg-success animate-pulse" : "bg-warning"}`} />
              <span className="text-xs text-muted-foreground capitalize">{timer.status}</span>
            </div>
          )}
        </div>

        {/* Task selector */}
        <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={timer.status === "running" || timer.status === "paused"}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select a task to track..." />
          </SelectTrigger>
          <SelectContent>
            {assignedTasks.map((task) => {
              const proj = mockProjects.find((p) => p.id === task.projectId);
              return (
                <SelectItem key={task.id} value={task.id}>
                  <span className="flex items-center gap-2">
                    {proj && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />}
                    <span className="truncate">{task.title}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Timer display */}
        <div className="text-center">
          <p className="text-4xl font-mono font-bold tracking-wider text-foreground">
            {formatDuration(timer.elapsedSeconds)}
          </p>
          {selectedTask?.estimatedEffortMinutes && (
            <p className="text-xs text-muted-foreground mt-1">
              Estimate: {Math.floor(selectedTask.estimatedEffortMinutes / 60)}h {selectedTask.estimatedEffortMinutes % 60}m
              {project && <span> · {project.name}</span>}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {timer.status === "idle" || timer.status === "stopped" ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => timer.start()}
              disabled={!selectedTaskId}
            >
              <Play className="h-4 w-4" /> Start
            </Button>
          ) : timer.status === "running" ? (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => timer.pause()}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleStop}>
                <Square className="h-4 w-4" /> Stop
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => timer.resume()}>
                <Play className="h-4 w-4" /> Resume
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleStop}>
                <Square className="h-4 w-4" /> Stop
              </Button>
            </>
          )}
          {(timer.status === "stopped" || timer.status === "paused") && (
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
