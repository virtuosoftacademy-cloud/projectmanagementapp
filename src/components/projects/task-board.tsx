"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert, Clock, GripVertical, Paperclip, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { AvatarStack } from "@/components/avatar-stack";
import { moveTaskAction } from "@/lib/actions";
import { TASK_STATUSES, type Task, type TaskStatus, formatDay } from "@/lib/domain";
import { priorityVariant } from "@/lib/status";
import { cn, formatDuration } from "@/lib/utils";

/** Identifies our own drags, so a drop from elsewhere is ignored. */
const DRAG_TYPE = "application/x-task-id";

/**
 * Kanban board grouped by task status.
 *
 * Cards move by dragging, and each card also carries a status menu. That is not
 * redundant: HTML5 drag-and-drop does not fire on touch devices and cannot be
 * driven from the keyboard, so dragging alone would make the board unusable on
 * a phone and inaccessible with a screen reader. The menu is the real control;
 * dragging is the shortcut.
 *
 * Moves are optimistic — the card lands in its new column immediately, and
 * `useOptimistic` discards the guess when the refreshed server data arrives.
 * A rejected move therefore snaps back on its own; the error explains why.
 */
export function TaskBoard({
  tasks,
  canManage = false,
  onAdd,
}: {
  tasks: Task[];
  /** `tasks.manage`. Without it the board is read-only. */
  canManage?: boolean;
  onAdd?: (status: TaskStatus) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const [optimisticTasks, applyMove] = useOptimistic(
    tasks,
    (current, move: { taskId: string; status: TaskStatus }) =>
      current.map((task) =>
        task.id === move.taskId ? { ...task, status: move.status } : task,
      ),
  );

  function move(taskId: string, status: TaskStatus) {
    const task = optimisticTasks.find((item) => item.id === taskId);
    // Dropping a card back where it started is not a change worth a round trip.
    if (!task || task.status === status) return;

    setError(null);
    startTransition(async () => {
      applyMove({ taskId, status });
      const result = await moveTaskAction(taskId, status);
      if (!result.ok) {
        setError(result.error ?? "Could not move that task.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="grid min-h-[60vh] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map(({ status, label }) => {
          const column = optimisticTasks.filter((task) => task.status === status);
          const isTarget = dropTarget === status;

          return (
            <div
              key={status}
              className="space-y-3"
              onDragOver={(event) => {
                if (!canManage || !event.dataTransfer.types.includes(DRAG_TYPE)) return;
                // Without preventDefault the browser refuses the drop outright.
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(status);
              }}
              onDragLeave={(event) => {
                // Ignore the events fired while crossing child elements.
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setDropTarget((current) => (current === status ? null : current));
              }}
              onDrop={(event) => {
                if (!canManage) return;
                event.preventDefault();
                const taskId = event.dataTransfer.getData(DRAG_TYPE);
                setDropTarget(null);
                setDragging(null);
                if (taskId) move(taskId, status);
              }}
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {label}
                  <span className="ml-1 font-mono text-xs">{column.length}</span>
                </h3>
                {onAdd ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAdd(status)}
                    aria-label={`Add task to ${label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>

              <div
                className={cn(
                  "min-h-[100px] space-y-2 rounded-lg border border-dashed border-transparent p-1 transition-colors",
                  isTarget && "border-primary/40 bg-primary/5",
                )}
              >
                {column.map((task) => (
                  <Card
                    key={task.id}
                    draggable={canManage}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_TYPE, task.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDragging(task.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setDropTarget(null);
                    }}
                    className={cn(
                      "shadow-none transition-all hover:border-primary/20",
                      canManage && "cursor-grab active:cursor-grabbing",
                      dragging === task.id && "opacity-50",
                    )}
                  >
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex min-w-0 items-start gap-1.5 text-sm font-medium">
                          {canManage ? (
                            <GripVertical
                              aria-hidden
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                            />
                          ) : null}
                          {/* The title is the way into the task, so it is the
                              link — not the whole card, which has a status menu
                              and a drag handle inside it. */}
                          <Link
                            href={`/projects/project/${task.projectId}/tasks/${task.id}`}
                            className="min-w-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {task.title}
                          </Link>
                        </p>
                        <Badge variant={priorityVariant[task.priority]} className="capitalize">
                          {task.priority}
                        </Badge>
                      </div>

                      {task.labels.length || task.billable ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {task.labels.map((label) => (
                            <Badge
                              key={label.id}
                              variant="outline"
                              className="gap-1 px-1.5 text-[10px]"
                              style={{ borderColor: label.color }}
                            >
                              <span
                                aria-hidden
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: label.color }}
                              />
                              {label.name}
                            </Badge>
                          ))}
                          {task.billable ? (
                            <Badge variant="secondary" className="text-[10px]">
                              billable
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {/* Logged against estimate, because the useful
                              question on a board is how much is left, not what
                              was once guessed. */}
                          <span
                            className={cn(
                              "font-mono",
                              task.estimateHours > 0 &&
                                task.trackedHours > task.estimateHours &&
                                "text-destructive",
                            )}
                          >
                            {formatDuration(task.trackedHours)}
                          </span>
                          <span className="font-mono">
                            / {task.estimateHours ? formatDuration(task.estimateHours) : "—"}
                          </span>
                        </span>
                        <AvatarStack people={task.assignees} max={3} />
                      </div>

                      {task.attachmentCount ? (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          {task.attachmentCount}
                        </p>
                      ) : null}

                      {task.dueDate ? (
                        <p className="text-xs text-muted-foreground">
                          Due <span className="font-mono">{formatDay(task.dueDate)}</span>
                        </p>
                      ) : null}

                      {canManage ? (
                        <SelectField
                          value={task.status}
                          disabled={pending}
                          aria-label={`Status for ${task.title}`}
                          className="h-8 text-xs"
                          onValueChange={(value) => move(task.id, value as TaskStatus)}
                          options={TASK_STATUSES.map((item) => ({
                            value: item.status,
                            label: item.label,
                          }))}
                        />
                      ) : null}
                    </CardContent>
                  </Card>
                ))}

                {column.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    {canManage ? "Drop a task here" : "Nothing here"}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
