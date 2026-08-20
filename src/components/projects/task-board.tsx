import { Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarStack } from "@/components/avatar-stack";
import { TASK_STATUSES, type Task, type TaskStatus, formatDay } from "@/lib/domain";
import { priorityVariant } from "@/lib/status";
import { formatDuration } from "@/lib/utils";

/** Kanban board grouped by task status. */
export function TaskBoard({
  tasks,
  onAdd,
}: {
  tasks: Task[];
  onAdd?: (status: TaskStatus) => void;
}) {
  return (
    <div className="grid min-h-[60vh] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {TASK_STATUSES.map(({ status, label }) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                {label}
                <span className="ml-1 text-xs">{column.length}</span>
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

            <div className="min-h-[100px] space-y-2 rounded-lg p-1">
              {column.map((task) => (
                <Card key={task.id} className="shadow-none transition-colors hover:border-primary/20">
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge variant={priorityVariant[task.priority]} className="capitalize">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.billable ? (
                      <Badge variant="secondary" className="text-[10px]">
                        billable
                      </Badge>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Est. <span className="font-mono">{formatDuration(task.estimateHours)}</span>
                      </span>
                      <AvatarStack people={task.assignees} max={3} />
                    </div>
                    {task.dueDate ? (
                      <p className="text-xs text-muted-foreground">
                        Due <span className="font-mono">{formatDay(task.dueDate)}</span>
                      </p>
                    ) : null}
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
