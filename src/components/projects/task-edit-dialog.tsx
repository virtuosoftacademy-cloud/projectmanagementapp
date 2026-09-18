"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogActions } from "@/components/ui/form-actions";
import { Field } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITIES,
  TASK_STATUSES,
  type Label,
  type Member,
  type Priority,
  type Task,
  type TaskStatus,
} from "@/lib/domain";

export type TaskEdit = {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: string[];
  labelIds: string[];
  estimateHours: number;
  billable: boolean;
  dueDate: string;
};

/** Adds or removes one id, so the checkbox lists stay set-like. */
function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

/**
 * Edit an existing task.
 *
 * Separate from `TaskDialog` (which creates) rather than one dialog doing both:
 * creating asks which project, editing does not — a task cannot move between
 * projects once it has time logged against it — and editing offers description,
 * labels and several assignees, none of which the quick create needs.
 */
export function TaskEditDialog({
  open,
  onClose,
  onSubmit,
  task,
  members,
  labels,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (edit: TaskEdit) => void;
  task: Task;
  members: Member[];
  labels: Label[];
  pending?: boolean;
  error?: string | null;
}) {
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeIds: task.assignees.map((person) => person.id),
    labelIds: task.labels.map((label) => label.id),
    estimateHours: task.estimateHours,
    dueDate: task.dueDate ?? "",
    billable: task.billable,
  });

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Edit task"
      description="Change the details of this task."
    >
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            taskId: task.id,
            title: draft.title,
            description: draft.description,
            status: draft.status,
            priority: draft.priority,
            assigneeIds: draft.assigneeIds,
            labelIds: draft.labelIds,
            estimateHours: Number(draft.estimateHours) || 0,
            billable: draft.billable,
            dueDate: draft.dueDate,
          });
        }}
      >
        <Field label="Title" required>
          <Input
            required
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </Field>

        <Field label="Description">
          <Textarea
            rows={4}
            value={draft.description}
            placeholder="What needs doing?"
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <SelectField
              value={draft.status}
              onValueChange={(value) => set("status", value as TaskStatus)}
              options={TASK_STATUSES.map(({ status, label }) => ({ value: status, label }))}
            />
          </Field>
          <Field label="Priority">
            <SelectField
              value={draft.priority}
              className="capitalize"
              onValueChange={(value) => set("priority", value as Priority)}
              options={PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estimate (hours)">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={draft.estimateHours}
              onChange={(event) => set("estimateHours", Number(event.target.value))}
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(event) => set("dueDate", event.target.value)}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">Assigned to</legend>
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nobody in this workspace yet.</p>
          ) : (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2">
              {members.map((member) => (
                <label key={member.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.assigneeIds.includes(member.id)}
                    onCheckedChange={() => set("assigneeIds", toggle(draft.assigneeIds, member.id))}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">Labels</legend>
          {labels.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No labels yet — create them in project settings.
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-md border p-2">
              {labels.map((label) => (
                <label key={label.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.labelIds.includes(label.id)}
                    onCheckedChange={() => set("labelIds", toggle(draft.labelIds, label.id))}
                  />
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.billable}
            onChange={(event) => set("billable", event.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Billable
        </label>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions
            onCancel={onClose}
            submitLabel={pending ? "Saving…" : "Save changes"}
            disabled={pending}
          />
        </div>
      </form>
    </FormDialog>
  );
}
