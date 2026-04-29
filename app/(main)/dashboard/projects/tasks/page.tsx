import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { ProjectList } from "@/components/projects/ProjectList";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get active workspace from cookie with fallback
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

  // Fetch projects filtered by the ACTIVE workspace AND user membership
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: activeWorkspace?.id,
      OR: [
        { userId: user.id },
        { members: { some: { id: user.id } } }
      ]
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      user: true,
      tasks: true,
      members: true
    }
  });

  // Fetch team members (users who share the same teamId)
  let teamMembers: any[] = [];
  if (user.teamId) {
    teamMembers = await prisma.user.findMany({
      where: {
        teamId: user.teamId
      },
      select: {
        id: true,
        name: true,
        avatar: true
      },
      take: 5 
    });
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
               {activeWorkspace?.name || "No Workspace"}
             </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">All projects in your workspace</p>
        </div>
        <CreateProjectDialog 
          workspaceId={activeWorkspace?.id || ""} 
          teamMembers={teamMembers} 
        />
      </div>

      <ProjectList 
        projects={projects} 
        teamMembers={teamMembers} 
      />
    </div>
  );
}