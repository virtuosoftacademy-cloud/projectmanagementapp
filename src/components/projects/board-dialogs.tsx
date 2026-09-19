"use client";

import { useState } from "react";
import { DialogActions } from "@/components/ui/form-actions";
import { Field } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { TaskSubtasks } from "@/components/projects/task-subtasks";
import {
  TASK_STATUSES,
  type BoardList,
  type RunningTimer,
  type Subtask,
  type TaskStatus,
} from "@/lib/domain";

const STATUS_OPTIONS = TASK_STATUSES.map(({ status, label }) => ({ value: status, label }));

/** A card's subtasks — the same mind map as on the task page. */
export function SubtasksDialog({
  open,
  taskId,
  taskTitle,
  subtasks,
  running,
  canManage,
  canLog,
  onClose,
}: {
  open: boolean;
  taskId: string;
  taskTitle: string;
  subtasks: Subtask[];
  running: RunningTimer | null;
  canManage: boolean;
  canLog: boolean;
  onClose: () => void;
}) {
  return (
    <FormDialog open={open} onClose={onClose} title={taskTitle} className="sm:max-w-4xl">
      <TaskSubtasks
        taskId={taskId}
        taskTitle={taskTitle}
        subtasks={subtasks}
        running={running}
        canManage={canManage}
        canLog={canLog}
      />
    </FormDialog>
  );
}

/** Name a new board, or rename one. */
export function BoardNameDialog({
  open,
  title,
  initial,
  submitLabel,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: string;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial);

  return (
    <FormDialog open={open} onClose={onClose} title={title}>
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name);
        }}
      >
        <Field label="Name" required>
          <Input
            required
            autoFocus
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions onCancel={onClose} submitLabel={submitLabel} disabled={pending} />
        </div>
      </form>
    </FormDialog>
  );
}

/**
 * Create a list, or rename one and change what it counts as.
 *
 * The status field is what makes a free-form list safe: "QA" can be anything
 * the team likes, as long as it says whether its cards are in review or done.
 * Changing it on an existing list re-labels every card on it, which the hint
 * spells out — it moves those cards in every report.
 */
export function ListDialog({
  open,
  title,
  initial,
  cardCount,
  submitLabel,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: { name: string; status: TaskStatus };
  /** How many cards a status change would affect; omitted for a new list. */
  cardCount?: number;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (value: { name: string; status: TaskStatus }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const changingStatus = cardCount !== undefined && status !== initial.status && cardCount > 0;

  return (
    <FormDialog open={open} onClose={onClose} title={title}>
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ name, status });
        }}
      >
        <Field label="Name" required>
          <Input
            required
            autoFocus
            maxLength={60}
            value={name}
            placeholder="e.g. Backlog, QA, Waiting on client"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          label="Counts as"
          hint="Cards on this list take this status, which is what progress and reports use."
        >
          <SelectField
            value={status}
            onValueChange={(value) => setStatus(value as TaskStatus)}
            options={STATUS_OPTIONS}
          />
        </Field>
        {changingStatus ? (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            The {cardCount} card{cardCount === 1 ? "" : "s"} on this list will change status too.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions onCancel={onClose} submitLabel={submitLabel} disabled={pending} />
        </div>
      </form>
    </FormDialog>
  );
}

/**
 * Move a card without dragging it.
 *
 * Drag and drop does not fire on touch screens and cannot be driven from the
 * keyboard; this is the same move, reachable by both.
 */
export function MoveCardDialog({
  open,
  title,
  lists,
  countIn,
  initialListId,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  lists: BoardList[];
  /** Cards already in a list, excluding the one being moved. */
  countIn: (listId: string) => number;
  initialListId: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (listId: string, index: number) => void;
}) {
  const [listId, setListId] = useState(initialListId);
  const [position, setPosition] = useState("end");
  const slots = countIn(listId);

  return (
    <FormDialog open={open} onClose={onClose} title={`Move ${title}`}>
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(listId, position === "end" ? slots : Number(position));
        }}
      >
        <Field label="List">
          <SelectField
            value={listId}
            onValueChange={(value) => {
              setListId(value);
              setPosition("end");
            }}
            options={lists.map((list) => ({ value: list.id, label: list.name }))}
          />
        </Field>
        <Field label="Position">
          <SelectField
            value={position}
            onValueChange={setPosition}
            options={[
              ...Array.from({ length: slots }, (_, index) => ({
                value: String(index),
                label: index === 0 ? "Top" : `${index + 1}`,
              })),
              { value: "end", label: "Bottom" },
            ]}
          />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions onCancel={onClose} submitLabel="Move" disabled={pending} />
        </div>
      </form>
    </FormDialog>
  );
}
