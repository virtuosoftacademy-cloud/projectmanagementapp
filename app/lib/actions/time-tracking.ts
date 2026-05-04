'use server';

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/app/lib/auth";
import { cookies } from "next/headers";

// Types
export type CreateTimeEntryInput = {
  taskId: string;
  duration: number;           // in minutes
  date?: string;
  notes?: string;
//   isBillable?: boolean;
  pausedTimes?: any;          // JSON for timer pauses
};

export type UpdateTimeEntryInput = {
  id: string;
  duration?: number;
  notes?: string;
//   isBillable?: boolean;
};

/**
 * Log new time entry (Manual + Timer)
 */
export async function createTimeEntry(data: CreateTimeEntryInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const cookieStore = await cookies();
    const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;

    // Verify task exists and belongs to active workspace
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      include: { project: true }
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Security: Check workspace ownership
    if (activeWorkspaceId && task.project?.workspaceId !== activeWorkspaceId) {
      return { success: false, error: "Access denied to this project" };
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        taskId: data.taskId,
        userId: user.id,
        duration: data.duration,
        date: data.date ? new Date(data.date) : new Date(),
        notes: data.notes || null,
        // isBillable: data.isBillable ?? task.isBillable ?? true,
        pausedTimes: data.pausedTimes || null,
      },
      include: {
        task: {
          select: { title: true, projectId: true }
        },
        user: {
          select: { name: true }
        }
      }
    });

    // Revalidate relevant pages
    revalidatePath("/dashboard/time-tracking");
    if (task.projectId) {
      revalidatePath(`/dashboard/projects/${task.projectId}`);
    }

    return { 
      success: true, 
      data: timeEntry 
    };

  } catch (error: any) {
    console.error("Create Time Entry Error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to log time entry" 
    };
  }
}

/**
 * Update existing time entry
 */
export async function updateTimeEntry(data: UpdateTimeEntryInput) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const entry = await prisma.timeEntry.findUnique({
      where: { id: data.id },
      include: { task: { include: { project: true } } }
    });

    if (!entry) return { success: false, error: "Time entry not found" };

    // Only allow owner or admin to edit
    if (entry.userId !== user.id) {
      return { success: false, error: "You can only edit your own time entries" };
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: data.id },
      data: {
        duration: data.duration,
        notes: data.notes,
        isBillable: data.isBillable,
        updatedAt: new Date(),
      }
    });

    revalidatePath("/dashboard/time-tracking");
    if (entry.task.projectId) {
      revalidatePath(`/dashboard/projects/${entry.task.projectId}`);
    }

    return { success: true, data: updatedEntry };

  } catch (error: any) {
    console.error("Update Time Entry Error:", error);
    return { success: false, error: "Failed to update time entry" };
  }
}

/**
 * Delete time entry
 */
export async function deleteTimeEntry(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!entry) return { success: false, error: "Time entry not found" };

    if (entry.userId !== user.id) {
      return { success: false, error: "You can only delete your own entries" };
    }

    await prisma.timeEntry.delete({ where: { id } });

    revalidatePath("/dashboard/time-tracking");
    if (entry.task.projectId) {
      revalidatePath(`/dashboard/projects/${entry.task.projectId}`);
    }

    return { success: true };

  } catch (error: any) {
    console.error("Delete Time Entry Error:", error);
    return { success: false, error: "Failed to delete time entry" };
  }
}

/**
 * Get time entries with filters (for dashboard)
 */
export async function getTimeEntries({
  projectId,
  taskId,
  userId,
  startDate,
  endDate,
  limit = 50
}: {
  projectId?: string;
  taskId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const where: any = {};

    if (taskId) where.taskId = taskId;
    if (userId) where.userId = userId;
    if (projectId) {
      where.task = { projectId };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          select: { id: true, title: true, projectId: true }
        },
        user: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    return { success: true, data: entries };
  } catch (error: any) {
    console.error("Get Time Entries Error:", error);
    return { success: false, error: "Failed to fetch time entries" };
  }
}