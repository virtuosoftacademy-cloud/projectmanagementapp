"use client";

import { useState } from "react";
import { DialogActions } from "@/components/ui/form-actions";
import { Field } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/utils";
import { parseDuration, toLocalInput } from "@/lib/duration";
import type { TaskEntry } from "@/lib/domain";

/** Which of the two ways of describing an entry the form is currently in. */
type Mode = "duration" | "range";

export type TimeEntryDraft = {
  durationMinutes?: number;
  date: string;
  startedAt?: string;
  endedAt?: string;
  note: string;
  /** Only sent when the form offered subtasks; null means the task as a whole. */
  subtaskId?: string | null;
};

/** Radix rejects an empty option value, so "no subtask" travels as a sentinel. */
const WHOLE_TASK = "none";

/** Today as `yyyy-mm-dd` in the viewer's timezone, for the date field's default. */
function todayInput() {
  const now = new Date();
  return toLocalInput(now).slice(0, 10);
}

/**
 * Add or edit a time entry.
 *
 * Two modes, because both are how people actually remember work: "about an
 * hour on Tuesday", and "09:15 until 10:40". The second additionally records
 * *when*, which is why an entry created by the timer always opens in it.
 *
 * The duration field accepts what people type — `90`, `1.5h`, `1h 30m`, `1:30`
 * — rather than insisting on a number of minutes; `parseDuration` is the same
 * function the preview under the field uses, so what is shown is what is sent.
 */
export function TimeEntryForm({
  open,
  onClose,
  onSubmit,
  entry,
  pending,
  error,
  subtasks,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: TimeEntryDraft) => void;
  /** Editing an existing entry, or undefined to add a new one. */
  entry?: TaskEntry;
  pending?: boolean;
  error?: string | null;
  /** The task's subtasks, to put the entry on one. Omitted or empty hides the field. */
  subtasks?: { value: string; label: string }[];
}) {
  const hasRange = Boolean(entry?.startedAt && entry?.endedAt);
  const [mode, setMode] = useState<Mode>(hasRange ? "range" : "duration");
  const [duration, setDuration] = useState(
    entry && !hasRange ? String(Math.round(entry.hours * 60)) : "",
  );
  const [date, setDate] = useState(entry?.date ?? todayInput());
  const [startedAt, setStartedAt] = useState(
    entry?.startedAt ? toLocalInput(entry.startedAt) : "",
  );
  const [endedAt, setEndedAt] = useState(entry?.endedAt ? toLocalInput(entry.endedAt) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [subtaskId, setSubtaskId] = useState(entry?.subtaskId ?? WHOLE_TASK);
  const offersSubtasks = Boolean(subtasks?.length);
  const chosenSubtask = offersSubtasks
    ? { subtaskId: subtaskId === WHOLE_TASK ? null : subtaskId }
    : {};

  const minutes = parseDuration(duration);
  const rangeMinutes =
    startedAt && endedAt
      ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)
      : null;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={entry ? "Edit time entry" : "Add time"}
      description="Record time as a duration on a day, or as a start and end time."
    >
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(
            mode === "range"
              ? {
                  date,
                  note,
                  // `datetime-local` has no timezone; the browser reads it as
                  // local wall time, and this converts to the absolute instant
                  // the server stores.
                  startedAt: new Date(startedAt).toISOString(),
                  endedAt: new Date(endedAt).toISOString(),
                  ...chosenSubtask,
                }
              : { date, note, durationMinutes: minutes ?? undefined, ...chosenSubtask },
          );
        }}
      >
        <div
          role="tablist"
          aria-label="How to enter the time"
          className="inline-flex h-9 items-center rounded-md bg-muted p-1 text-muted-foreground"
        >
          {(
            [
              { value: "duration", label: "Duration" },
              { value: "range", label: "Start & end" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                "inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === option.value && "bg-background text-foreground shadow-sm",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "duration" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration" required>
              <Input
                required
                autoFocus
                value={duration}
                placeholder="1h 30m"
                onChange={(event) => setDuration(event.target.value)}
                aria-describedby="duration-hint"
              />
              <p id="duration-hint" className="mt-1 text-xs text-muted-foreground">
                {duration && minutes === null
                  ? "Try 90, 1.5h, 1h 30m or 1:30."
                  : minutes
                    ? `${minutes} minute${minutes === 1 ? "" : "s"}`
                    : "e.g. 90, 1.5h, 1h 30m, 1:30"}
              </p>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Started" required>
              <Input
                required
                autoFocus
                type="datetime-local"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
              />
            </Field>
            <Field label="Ended" required>
              <Input
                required
                type="datetime-local"
                value={endedAt}
                onChange={(event) => setEndedAt(event.target.value)}
              />
              {rangeMinutes !== null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {rangeMinutes > 0
                    ? `${rangeMinutes} minute${rangeMinutes === 1 ? "" : "s"}`
                    : "End must be after start."}
                </p>
              ) : null}
            </Field>
          </div>
        )}

        {offersSubtasks ? (
          <Field label="Subtask">
            <SelectField
              value={subtaskId}
              onValueChange={setSubtaskId}
              aria-label="Subtask"
              options={[{ value: WHOLE_TASK, label: "The task as a whole" }, ...subtasks!]}
            />
          </Field>
        ) : null}

        <Field label="Note">
          <Input
            value={note}
            placeholder="What did you work on?"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions
            onCancel={onClose}
            submitLabel={pending ? "Saving…" : entry ? "Save changes" : "Add time"}
            disabled={
              pending ||
              (mode === "duration" ? !minutes : !startedAt || !endedAt || (rangeMinutes ?? 0) <= 0)
            }
          />
        </div>
      </form>
    </FormDialog>
  );
}
