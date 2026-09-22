"use server";

/**
 * Writes for the notification bell.
 *
 * Every action is scoped to the caller's own rows: a notification is addressed
 * to one person, so there is no permission to check beyond "is this yours".
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type ActionResult = { ok: boolean; error?: string };

/** Mark one of the caller's notifications read. Already-read ones are a no-op. */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { id, userId: user.id, workspaceId: user.workspaceId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Mark everything the caller has unread in this workspace as read. */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, workspaceId: user.workspaceId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
