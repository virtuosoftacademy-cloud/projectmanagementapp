"use server"

import { cookies } from "next/headers"
import { prisma } from "@/app/lib/prisma"
import { getCurrentUser } from "@/app/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Sets the active workspace ID in a cookie.
 * This will control which workspace is contextually active in the UI.
 */
export async function setActiveWorkspace(id: string) {
  const cookieStore = await cookies()
  cookieStore.set("active_workspace_id", id, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  revalidatePath("/")
  redirect("/dashboard")
}

/**
 * Creates a new workspace and sets it as the active one.
 * Workspaces are linked to the user who created them and their team.
 */
export async function createWorkspace(name: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        userId: user.id,
        teamId: user.teamId,
      },
    })

    await setActiveWorkspace(workspace.id)
    return { success: true, workspace }
  } catch (error) {
    console.error("Failed to create workspace:", error)
    return { error: "Failed to create workspace" }
  }
}

/**
 * Updates an existing workspace.
 * Only owners or users with ADMIN/MANAGER roles can update workspace settings.
 */
export async function updateWorkspace(id: string, name: string, description: string | null) {
  const user = await getCurrentUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
    })

    if (!workspace) {
      return { error: "Workspace not found" }
    }

    // Check if user is the owner or has appropriate permissions
    const isOwner = workspace.userId === user.id
    const hasPermission = user.role === "ADMIN" || user.role === "MANAGER"

    if (!isOwner && !hasPermission) {
      return { error: "You don't have permission to update this workspace" }
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        name,
        description,
      },
    })

    revalidatePath("/dashboard/settings")
    return { success: true, workspace: updatedWorkspace }
  } catch (error) {
    console.error("Failed to update workspace:", error)
    return { error: "Failed to update workspace" }
  }
}
