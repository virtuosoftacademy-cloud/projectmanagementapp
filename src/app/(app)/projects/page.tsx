import type { Metadata } from "next";
import { Activity, CircleCheck, Clock, FolderKanban } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProjectsGrid, type ProjectCard } from "@/components/projects/projects-grid";
import { can } from "@/lib/permissions";
import { getMembers, getMetrics, getProjectStats, getProjects, getTeams } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const viewer = await requireUser("/projects");
  const [metrics, projects, members, teams] = await Promise.all([
    getMetrics(viewer.workspaceId),
    getProjects(viewer.workspaceId),
    getMembers(viewer.workspaceId),
    getTeams(viewer.workspaceId),
  ]);

  const cards: ProjectCard[] = await Promise.all(
    projects.map(async (project) => {
      const stats = await getProjectStats(viewer.workspaceId, project.id);
      return { ...project, done: stats.done, taskCount: stats.taskCount };
    }),
  );

  return (
    <ProjectsGrid
      projects={cards}
      members={members}
      teams={teams}
      canCreate={can(viewer.role, "projects.create")}
      stats={
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={FolderKanban}
            tone="primary"
            value={metrics.totalProjects.toString()}
            label="Total Projects"
            hint={`${metrics.planningProjects} planning`}
          />
          <KpiCard
            icon={Activity}
            tone="success"
            value={metrics.activeProjects.toString()}
            label="Active"
            hint="In progress"
          />
          <KpiCard
            icon={CircleCheck}
            tone="warning"
            value={`${metrics.completionRate}%`}
            label="Task Completion"
            hint={`${metrics.tasksDone}/${metrics.tasksTotal} tasks`}
          />
          <KpiCard
            icon={Clock}
            tone="accent"
            value={metrics.completedProjects.toString()}
            label="Completed"
            hint="Wrapped up"
          />
        </div>
      }
    />
  );
}
