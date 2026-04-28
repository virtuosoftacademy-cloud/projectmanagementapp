"use server"

import { prisma } from "@/app/lib/prisma"
import { Role } from "@/app/types"
import { revalidatePath } from "next/cache"

export async function inviteMember(data: { name: string, email: string, role: Role, teamId?: string }) {
    try {
        // In a real app, this would send an email. 
        // For this demo/task, we'll create or update the user in the database.
        
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        })

        if (existingUser) {
            // Update existing user's role and team
            await prisma.user.update({
                where: { email: data.email },
                data: {
                    role: data.role,
                    teamId: data.teamId || existingUser.teamId
                }
            })
        } else {
            // Create a new "placeholder" user
            // In reality, you'd want them to set a password later
            await prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    teamId: data.teamId,
                    password: "password123" // Placeholder
                }
            })
        }

        revalidatePath("/dashboard/team")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateMemberRole(userId: string, role: Role) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        })
        revalidatePath("/dashboard/team")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
