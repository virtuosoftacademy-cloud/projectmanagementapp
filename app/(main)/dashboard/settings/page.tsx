import { getCurrentUser } from "@/app/lib/auth"
import { prisma } from "@/app/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { SettingsContent } from "@/components/settings/SettingsContent"

export default async function SettingsPage() {
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

    if (!activeWorkspace) {
        // If no workspace found, we might need to handle this
        // But layout.tsx usually ensures one exists or redirects
    }

    // Fetch team members if teamId exists
    let members: any[] = []
    if (user.teamId) {
        members = await prisma.user.findMany({
            where: {
                teamId: user.teamId
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true
            }
        })
    } else {
        // If no team, just show the user as the only member
        members = [{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
        }]
    }

    return (
        <div className="flex-1 p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Manage your workspace and profile
                </p>
            </div>
            <SettingsContent 
                user={user} 
                activeWorkspace={activeWorkspace} 
                members={members}
            />
        </div>
    )
}
