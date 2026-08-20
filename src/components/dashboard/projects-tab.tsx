import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/domain";
import { statusVariant } from "@/lib/status";
import { formatPkr } from "@/lib/utils";

export type ProjectRow = {
  project: Project;
  stats: { done: number; taskCount: number; hours: number; cost: number; progress: number };
};

export function ProjectsTab({ rows }: { rows: ProjectRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map(({ project, stats }) => {
        return (
          <Card key={project.id} className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                  style={{ color: project.color }}
                >
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/project/${project.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <Stat label="Tasks" value={`${stats.done}/${stats.taskCount}`} />
                      <Stat label="Hours" value={stats.hours.toString()} />
                      <Stat label="Cost" value={formatPkr(stats.cost)} />
                      <Stat label="Members" value={project.members.length.toString()} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={stats.progress} aria-label={`${project.name} progress`} />
                    <span className="w-10 text-right font-mono text-xs font-medium text-muted-foreground">
                      {stats.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-medium text-foreground">{value}</p>
    </div>
  );
}
