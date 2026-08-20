import type { BadgeVariant } from "@/components/ui/badge";
import type { Priority, ProjectStatus, TaskStatus } from "@/lib/domain";

export const statusVariant: Record<ProjectStatus, BadgeVariant> = {
  active: "success",
  planning: "warning",
  "on-hold": "muted",
  completed: "secondary",
};

export const priorityVariant: Record<Priority, BadgeVariant> = {
  low: "muted",
  medium: "secondary",
  high: "warning",
  urgent: "destructive",
};

/** Chart and dot colors per task status. */
export const taskStatusColor: Record<TaskStatus, string> = {
  todo: "hsl(var(--muted-foreground))",
  "in-progress": "hsl(var(--primary))",
  "in-review": "hsl(var(--warning))",
  done: "hsl(var(--success))",
};
