// app/dashboard/projects/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { cookies } from "next/headers";

import { Task, TaskStatus } from "@/app/types";
import ProjectDetails from "./ProjectDetails";
import { transformTeams, transformUsers } from "@/app/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        include: {
          user: true, // if you need user relation on tasks
        },
      },
    },
  });


  if (!project) {
    notFound();
  }

  // Security check
  if (activeWorkspaceId && project.workspaceId !== activeWorkspaceId) {
    redirect("/dashboard/projects");
  }

  // Fetch related mock data or convert Prisma tasks to your Task type
  // For now assuming you map Prisma data to your mock shape
  const initialTasks: Task[] = project.tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status as TaskStatus,
    priority: t.priority || "medium",
    assigneeIds: t.assigneeIds || [],
    estimatedEffortMinutes: t.estimatedEffortMinutes,
    dueDate: t.dueDate,
    isBillable: t.isBillable || false,
    parentTaskId: t.parentTaskId,
    projectId: t.projectId
  }));

  const [prismaUsers, prismaTeams] = await Promise.all([
    prisma.user.findMany({
      include: {
        team: true,

      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.team.findMany({
      include: {
        members: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true
          }
        }
      }
    })
  ])

  const users = transformUsers(prismaUsers)
  const teams = transformTeams(prismaTeams)

  return (
    <ProjectDetails
      users={users}
      teams={teams}
      project={project}
      initialTasks={initialTasks}
      projectId={id}
    />
  );
}