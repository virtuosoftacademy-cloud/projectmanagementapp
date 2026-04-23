"use server"

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../auth";

export async function createProject(formData: {
  name: string;
  description?: string;
  status: string;
  color: string;
  startDate?: string;
  endDate?: string;
  workspaceId: string;
  memberIds: string[];
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        color: formData.color,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        userId: user.id, // Owner
        workspaceId: formData.workspaceId,
        members: {
          connect: formData.memberIds.map(id => ({ id }))
        }
      }
    });

    revalidatePath("/dashboard/projects");
    return { success: true, project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}
