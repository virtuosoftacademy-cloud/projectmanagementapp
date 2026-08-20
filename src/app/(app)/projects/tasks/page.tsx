import type { Metadata } from "next";
import { TasksView } from "@/components/projects/tasks-view";
import { can } from "@/lib/permissions";
import { getMembers, getProjects, getTasks } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const viewer = await requireUser("/projects/tasks");
  const [tasks, projects, members] = await Promise.all([
    getTasks(viewer.workspaceId),
    getProjects(viewer.workspaceId),
    getMembers(viewer.workspaceId),
  ]);

  const rows = tasks.map((task) => ({
    ...task,
    projectName: projects.find((project) => project.id === task.projectId)?.name ?? "",
  }));

  return (
    <TasksView
      tasks={rows}
      projects={projects}
      members={members}
      canManage={can(viewer.role, "tasks.manage")}
    />
  );
}
