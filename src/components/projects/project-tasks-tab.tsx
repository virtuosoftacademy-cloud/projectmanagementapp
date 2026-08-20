"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskBoard } from "@/components/projects/task-board";
import { TaskDialog } from "@/components/projects/task-dialog";
import { createTaskAction } from "@/lib/actions";
import type { Member, Task, TaskStatus } from "@/lib/domain";

/** Project kanban with a per-column "add task" affordance. */
export function ProjectTasksTab({
  projectId,
  tasks,
  members,
  canManage,
}: {
  projectId: string;
  tasks: Task[];
  members: Member[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);

  return (
    <>
      <TaskBoard tasks={tasks} onAdd={canManage ? setAddingTo : undefined} />
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
    </>
  );
}
