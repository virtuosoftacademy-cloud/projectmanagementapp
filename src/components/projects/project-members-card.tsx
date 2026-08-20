"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { addProjectMembersAction } from "@/lib/actions";
import type { Member } from "@/lib/domain";

export type ProjectMemberRow = {
  member: Member;
  tasksDone: number;
  tasksTotal: number;
  hours: number;
};

export function ProjectMembersCard({
  projectId,
  rows,
  candidates,
  canEdit,
}: {
  projectId: string;
  rows: ProjectMemberRow[];
  /** Every workspace member; those already on the project are filtered out. */
  candidates: Member[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const available = candidates.filter(
    (member) => !rows.some((row) => row.member.id === member.id),
  );

  function add() {
    startTransition(async () => {
      const result = await addProjectMembersAction(projectId, selected);
      if (result.ok) {
        setSelected([]);
        setAdding(false);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Members</CardTitle>
        {canEdit ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setAdding(true)}
            disabled={available.length === 0 || pending}
          >
            <Plus className="h-3.5 w-3.5" />
            Add member
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(({ member, tasksDone, tasksTotal, hours }) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
          >
            <UserAvatar
              name={member.name}
              className="h-9 w-9 bg-primary/10"
              textClassName="text-xs text-primary"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="capitalize">{member.role}</span> · {member.email}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs">
              <p className="font-mono font-medium">
                {tasksDone}/{tasksTotal} tasks
              </p>
              <p className="font-mono text-muted-foreground">{hours.toFixed(1)}h logged</p>
            </div>
          </div>
        ))}
      </CardContent>

      <FormDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add member"
        description="Pick workspace members to add to this project."
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
            {available.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(member.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(member.id)
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id],
                    )
                  }
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{member.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </span>
              </label>
            ))}
            {available.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                Everyone in the workspace is already on this project.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogActions
              onCancel={() => setAdding(false)}
              submitLabel="Add"
              disabled={selected.length === 0 || pending}
            />
          </div>
        </form>
      </FormDialog>
    </Card>
  );
}
