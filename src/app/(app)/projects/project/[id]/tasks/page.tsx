import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectTasksTab } from "@/components/projects/project-tasks-tab";
import { can } from "@/lib/permissions";
import { getMembers, getProject, getProjectStats } from "@/lib/queries";
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

  const [stats, members] = await Promise.all([
    getProjectStats(viewer.workspaceId, project.id),
    getMembers(viewer.workspaceId),
  ]);

  return (
    <ProjectTasksTab
      projectId={project.id}
      tasks={stats.tasks}
      members={members}
      canManage={can(viewer.role, "tasks.manage")}
    />
  );
}
