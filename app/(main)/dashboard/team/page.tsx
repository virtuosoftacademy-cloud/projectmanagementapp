import { getCurrentUser } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { TeamPageContent } from "@/components/team/TeamPageContent"

export default async function TeamPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect("/auth/login")
    }

    const cookieStore = await cookies()
    const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value

    // Fetch workspaces to find the active one
    const workspaces = await prisma.workspace.findMany({
        where: {
            OR: [
                { userId: user.id },
                { teamId: user.teamId }
            ]
        }
    })

    const activeWorkspace = activeWorkspaceId 
        ? workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0]
        : workspaces.find(w => w.name === "Acme Inc.") || workspaces[0]

    // Fetch all teams
    const teams = await prisma.team.findMany({
        orderBy: { name: "asc" }
    })

    // Fetch all users in the system (or filter by workspace/team if preferred)
    const users = await prisma.user.findMany({
        include: {
            team: true,
            projects: {
                select: { id: true, name: true, status: true, color: true },
                take: 5
            },
            memberOfProject: {
                select: { id: true, name: true, status: true, color: true },
                take: 5
            },
            tasks: {
                select: { id: true, title: true, status: true, priority: true },
                take: 5
            }
        },
        orderBy: { name: "asc" }
    })

    // Transform users to include counts and lists
    const membersWithStats = users.map(u => {
        const allProjects = [...u.projects, ...u.memberOfProject]
        return {
            ...u,
            projectsCount: u.projects.length + u.memberOfProject.length,
            tasksCount: u.tasks.length,
            completedTasksCount: u.tasks.filter(t => t.status === "DONE").length,
            assignedProjects: allProjects,
            currentTasks: u.tasks.filter(t => t.status !== "DONE")
        }
    })

    return (
        <TeamPageContent 
            initialMembers={membersWithStats as any} 
            teams={teams}
            activeWorkspace={activeWorkspace}
        />
    )
}