"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { logTimeAction } from "@/lib/actions";
import { TODAY, formatDay } from "@/lib/domain";
import { cn, formatDuration } from "@/lib/utils";

export type LogRow = {
  id: string;
  date: string;
  memberName: string;
  taskTitle: string;
  projectName: string;
  hours: number;
  variance: number;
  note: string;
};

export function TimeLogs({
  logs,
  tasks,
  canLog,
  children,
}: {
  logs: LogRow[];
  tasks: { id: string; title: string; projectName: string; estimateHours: number }[];
  canLog: boolean;
  /** Cards rendered between the header and the log table. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Time Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and review your team&apos;s time
          </p>
        </div>
        {canLog ? (
          <Button size="sm" onClick={() => setLogging(true)} disabled={pending}>
            <Plus className="h-4 w-4" />
            Log Time
          </Button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {children}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Time Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                  <th className="px-3 py-2 text-right font-medium">Variance</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {logs.map((log) => (
                  <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{formatDay(log.date)}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <UserAvatar
                          name={log.memberName}
                          className="h-6 w-6 bg-primary/10"
                          textClassName="text-[10px] text-primary"
                        />
                        <span className="whitespace-nowrap">
                          {log.memberName.split(" ")[0]}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2">{log.taskTitle}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {log.projectName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono">
                      {formatDuration(log.hours)}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-right font-mono",
                        log.variance < 0 && "text-destructive",
                      )}
                    >
                      {log.variance < 0 ? "+" : ""}
                      {formatDuration(Math.abs(log.variance))}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <LogTimeDialog
        key={String(logging)}
        open={logging}
        onClose={() => setLogging(false)}
        tasks={tasks}
        pending={pending}
        onSubmit={(draft) => {
          startTransition(async () => {
            const result = await logTimeAction(draft);
            setError(result.error ?? null);
            if (result.ok) {
              setLogging(false);
              router.refresh();
            }
          });
        }}
      />
    </div>
  );
}

function LogTimeDialog({
  open,
  onClose,
  onSubmit,
  tasks,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: { taskId: string; minutes: number; date: string; note: string }) => void;
  tasks: { id: string; title: string; projectName: string }[];
  pending?: boolean;
}) {
  const [draft, setDraft] = useState({
    taskId: "",
    minutes: 60,
    date: TODAY,
    note: "",
  });

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Log Time"
      description="Record time spent on a task."
    >
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(draft);
        }}
      >
        <Field label="Task" required>
          <SelectField
            value={draft.taskId}
            onValueChange={(value) => set("taskId", value)}
            placeholder="Select task"
            options={tasks.map((task) => ({
              value: task.id,
              label: `${task.title} · ${task.projectName}`,
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)" required>
            <Input
              required
              type="number"
              min={1}
              step={1}
              value={draft.minutes}
              onChange={(event) => set("minutes", Number(event.target.value))}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={draft.date}
              onChange={(event) => set("date", event.target.value)}
            />
          </Field>
        </div>

        <Field label="Notes">
          <Input
            value={draft.note}
            placeholder="What did you work on?"
            onChange={(event) => set("note", event.target.value)}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions
            onCancel={onClose}
            submitLabel="Log"
            disabled={!draft.taskId || pending}
          />
        </div>
      </form>
    </FormDialog>
  );
}
