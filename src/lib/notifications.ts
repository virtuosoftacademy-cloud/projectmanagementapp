import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

/** What a notification is about. Kept as strings so adding one is not a migration. */
export type NotificationKind = "task-assigned" | "subtask-assigned" | "mention" | "workspace-added";

/**
 * Tell people something happened.
 *
 * Best-effort by design, like the activity feed: a failed insert must never
 * fail the action that succeeded — losing a bell entry is a far smaller
 * problem than telling somebody their task was not saved when it was.
 *
 * The actor is skipped: assigning something to yourself is not news.
 */
export async function notify(
  db: Db,
  input: {
    workspaceId: string;
    /** Recipients. Duplicates and the actor are dropped. */
    userIds: string[];
    actorId: string | null;
    kind: NotificationKind;
    title: string;
    body?: string;
    href?: string;
  },
) {
  const recipients = [...new Set(input.userIds)].filter((id) => id && id !== input.actorId);
  if (recipients.length === 0) return;

  try {
    await db.notification.createMany({
      data: recipients.map((userId) => ({
        workspaceId: input.workspaceId,
        userId,
        actorId: input.actorId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? "",
        href: input.href ?? "",
      })),
    });
  } catch {
    // Deliberately swallowed — see above.
  }
}
