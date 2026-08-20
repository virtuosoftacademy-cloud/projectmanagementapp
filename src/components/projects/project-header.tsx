import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Project } from "@/lib/domain";

/** Shared back-link + title row for the per-project sub-pages. */
export function ProjectHeader({
  project,
  title,
  description,
  action,
}: {
  project: Project;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/project/${project.id}`}
          aria-label={`Back to ${project.name}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-xl font-bold leading-tight tracking-tight">
              {project.name} — {title}
            </h1>
          </div>
          <p className="ml-5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
