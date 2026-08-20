"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TaskDialog } from "@/components/projects/task-dialog";
import { createTaskAction } from "@/lib/actions";
import {
  TASK_STATUSES,
  formatDay,
  type Member,
  type Project,
  type Task,
} from "@/lib/domain";
import { priorityVariant } from "@/lib/status";
import { cn } from "@/lib/utils";

type TaskRow = Task & { projectName: string };

export function TasksView({
  tasks,
  projects,
  members,
  canManage,
}: {
  tasks: TaskRow[];
  projects: Project[];
  members: Member[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"board" | "list">("board");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">All tasks across your projects</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Task view"
            className="inline-flex h-9 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
          >
            {(["board", "list"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium capitalize transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === value && "bg-background text-foreground shadow-sm",
                )}
              >
                {value}
              </button>
            ))}
          </div>
          {canManage ? (
            <Button size="sm" onClick={() => setCreating(true)} disabled={pending}>
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {view === "board" ? <Board tasks={tasks} /> : <List tasks={tasks} />}

      <TaskDialog
        key={String(creating)}
        open={creating}
        onClose={() => setCreating(false)}
        members={members}
        projects={projects}
        pending={pending}
        onSubmit={(draft) => {
          startTransition(async () => {
            const result = await createTaskAction(draft);
            setError(result.error ?? null);
            if (result.ok) {
              setCreating(false);
              router.refresh();
            }
          });
        }}
      />
    </div>
  );
}

function Board({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="grid min-h-[60vh] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {TASK_STATUSES.map(({ status, label }) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-medium text-muted-foreground">
                {label}
                <span className="ml-1 text-xs">{column.length}</span>
              </h2>
            </div>
            <div className="min-h-[100px] space-y-2 rounded-lg p-1">
              {column.map((task) => (
                <Card
                  key={task.id}
                  className="shadow-none transition-colors hover:border-primary/30"
                >
                  <CardContent className="space-y-2 p-3">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Link
                      href={`/projects/project/${task.projectId}`}
                      className="block text-xs text-muted-foreground hover:underline"
                    >
                      {task.projectName}
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={priorityVariant[task.priority]} className="capitalize">
                        {task.priority}
                      </Badge>
                      <AvatarStack people={task.assignees} max={3} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.dueDate ? `Due ${formatDay(task.dueDate)}` : "No due date"}</span>
                      <span>{task.subtasksTotal ?? 0} sub-tasks</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function List({ tasks }: { tasks: TaskRow[] }) {
  const statusLabel = Object.fromEntries(
    TASK_STATUSES.map(({ status, label }) => [status, label]),
  );

  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Assignee</th>
                <th className="px-4 py-2 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {tasks.map((task) => (
                <tr key={task.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-4 py-2">
                    {task.title}
                    {task.subtasksTotal ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({task.subtasksTotal} sub-tasks)
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    <Link href={`/projects/project/${task.projectId}`} className="hover:underline">
                      {task.projectName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{statusLabel[task.status]}</td>
                  <td className="px-4 py-2 capitalize">{task.priority}</td>
                  <td className="px-4 py-2">
                    <AvatarStack people={task.assignees} max={3} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono">
                    {task.dueDate ? formatDay(task.dueDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
