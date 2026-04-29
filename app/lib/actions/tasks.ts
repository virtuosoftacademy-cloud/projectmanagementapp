"use server"

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateTaskStatus(taskId: string, newStatus: string, projectId: string) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });
    
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update task status:", error);
    return { success: false };
  }
}

export async function createTask(data: {
  title: string;
  description?: string;
  status: string;
  priority: string;
  projectId: string;
  userId: string;
}) {
  try {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        projectId: data.projectId,
        userId: data.userId,
      }
    });

    revalidatePath(`/dashboard/projects/${data.projectId}`);
    return { success: true, task };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: "Failed to create task" };
  }
}
