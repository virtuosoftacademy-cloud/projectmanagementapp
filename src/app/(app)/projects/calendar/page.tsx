import type { Metadata } from "next";
import Link from "next/link";
import { TODAY, getMonthGrid } from "@/lib/domain";
import { getProjects, getTasks } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { taskStatusColor } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage() {
  const viewer = await requireUser("/projects/calendar");
  const [tasks, projects] = await Promise.all([
    getTasks(viewer.workspaceId),
    getProjects(viewer.workspaceId),
  ]);
  const { cells, label } = getMonthGrid(TODAY);
  const projectName = (id: string) => projects.find((project) => project.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">{label} — Task deadlines overview</p>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {cells.map((date, index) => {
          const due = date ? tasks.filter((task) => task.dueDate === date) : [];
          return (
            <div
              key={date ?? `empty-${index}`}
              className={cn(
                "min-h-[80px] bg-card p-2",
                date === TODAY && "bg-primary/5 ring-1 ring-inset ring-primary/30",
              )}
            >
              {date ? (
                <>
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    {Number(date.slice(8))}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {due.map((task) => (
                      <Link
                        key={task.id}
                        href={`/projects/project/${task.projectId}`}
                        title={`${task.title} · ${projectName(task.projectId)}`}
                        className="flex items-center gap-1 rounded bg-muted/60 px-1 py-0.5 text-[11px] hover:underline"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: taskStatusColor[task.status] }}
                        />
                        <span className="truncate">{task.title}</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
