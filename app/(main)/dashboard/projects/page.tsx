
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ProjectsContent } from "@/components/projects/ProjectsContent";
import { transformTeams, transformUsers } from "@/app/lib/utils";

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get active workspace from cookie
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { userId: user.id },
        { teamId: user.teamId }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  const activeWorkspace = activeWorkspaceId
    ? workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0]
    : workspaces.find(w => w.name === "Acme Inc.") || workspaces[0];

  // Fetch projects
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: activeWorkspace?.id,
      OR: [
        { userId: user.id },
        { members: { some: { id: user.id } } }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      tasks: true,
      members: true
    }
  });

  // Fetch team members
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
    <ProjectsContent
      activeWorkspace={activeWorkspace}
      projects={projects}
      teams={teams}
      users={users}
      userId={user.id}
    />
  );
}