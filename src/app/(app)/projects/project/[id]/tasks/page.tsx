import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectTasksTab } from "@/components/projects/project-tasks-tab";
import { can } from "@/lib/permissions";
import { getArchivedTasks, getLabels, getMembers, getProject, getProjectStats } from "@/lib/queries";
import { getSessionUser, requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/projects/project/[id]/tasks">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getSessionUser();
  const project = viewer?.workspaceId ? await getProject(viewer.workspaceId, id) : null;
  return { title: `${project?.name ?? "Project"} — Tasks` };
}

export default async function ProjectTasksPage({
  params,
}: PageProps<"/projects/project/[id]/tasks">) {
  const viewer = await requireUser();
  const { id } = await params;
  const project = await getProject(viewer.workspaceId, id);
  // A feature switched off is genuinely gone, not just hidden from the nav.
  if (!project || !project.features.includes("tasks")) notFound();

  const [stats, archived, members, labels] = await Promise.all([
    getProjectStats(viewer.workspaceId, project.id),
    getArchivedTasks(viewer.workspaceId),
    getMembers(viewer.workspaceId),
    getLabels(viewer.workspaceId),
  ]);

  return (
    <ProjectTasksTab
      projectId={project.id}
      // Archived tasks travel with the live ones so "Show archived" is a filter
      // rather than a page load; `stats.tasks` already excludes them.
      tasks={[...stats.tasks, ...archived.filter((task) => task.projectId === project.id)]}
      members={members}
      labels={labels}
      canManage={can(viewer.role, "tasks.manage")}
    />
  );
}
