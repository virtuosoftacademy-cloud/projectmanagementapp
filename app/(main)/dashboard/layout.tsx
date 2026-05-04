import { getCurrentUser } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { transformTeams, transformUsers } from "@/app/lib/utils"

export default async function MainPage({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/auth/login")
    }

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

    const projects = await prisma.project.findMany({
        where: { 
            workspaceId: activeWorkspace?.id,
            OR: [
                { userId: user.id },
                { members: { some: { id: user.id } } }
            ]
        },
        orderBy: { createdAt: "desc" },
    });
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
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar 
                variant="inset" 
                teams={teams}
                users={users}
                user={user} 
                projects={projects} 
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
            />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            {children}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}