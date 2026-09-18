"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskBoard } from "@/components/projects/task-board";
import { TaskDialog } from "@/components/projects/task-dialog";
import {
  EMPTY_FILTER,
  TaskFilters,
  filterTasks,
  type TaskFilter,
} from "@/components/projects/task-filters";
import { createTaskAction } from "@/lib/actions";
import type { Label, Member, Task, TaskStatus } from "@/lib/domain";

/** Project kanban with a filter bar and a per-column "add task" affordance. */
export function ProjectTasksTab({
  projectId,
  tasks,
  members,
  labels,
  canManage,
}: {
  projectId: string;
  /** Live and archived; the filter decides which are shown. */
  tasks: Task[];
  members: Member[];
  labels: Label[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);

  const visible = filterTasks(tasks, filter);

  return (
    <div className="space-y-4">
      <TaskFilters
        filter={filter}
        onChange={setFilter}
        members={members}
        labels={labels}
        resultCount={visible.length}
        totalCount={tasks.length}
      />

      <TaskBoard
        tasks={visible}
        canManage={canManage}
        onAdd={canManage ? setAddingTo : undefined}
      />

      <TaskDialog
        key={addingTo ?? "closed"}
        open={addingTo !== null}
        onClose={() => setAddingTo(null)}
        members={members}
        projectId={projectId}
        pending={pending}
        defaultStatus={addingTo ?? "todo"}
        onSubmit={(draft) => {
          startTransition(async () => {
            const result = await createTaskAction(draft);
            if (result.ok) {
              setAddingTo(null);
              router.refresh();
            }
          });
        }}
      />
    </div>
  );
}
