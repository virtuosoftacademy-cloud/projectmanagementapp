"use server";

import { prisma } from "@/lib/prisma";
import { requireAccount } from "@/lib/session";
import { createWorkspaceSchema, firstError } from "@/lib/validations";

export type CreateWorkspaceResult = { ok: boolean; error?: string; workspaceId?: string };

/**
 * Create a new workspace. Any signed-in user can do this — unlike everything
 * else gated by `requirePermission()`, there's no existing workspace role to
 * check yet, since the workspace doesn't exist until this runs. The creator
 * becomes its owner.
 *
 * Gated on `requireAccount`, not `requireUser`: this is the action onboarding
 * calls, and `requireUser` would redirect a workspace-less caller straight back
 * to onboarding — a loop that makes the first workspace uncreatable.
 */
export async function createWorkspaceAction(input: unknown): Promise<CreateWorkspaceResult> {
  const user = await requireAccount();

  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const clash = await prisma.workspace.findUnique({ where: { slug: data.slug } });
  if (clash) return { ok: false, error: "That workspace URL is already taken." };

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: { name: data.name, slug: data.slug },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: created.id, userId: user.id, role: "OWNER" },
    });
    await tx.user.update({ where: { id: user.id }, data: { lastWorkspaceId: created.id } });
    return created;
  });

  return { ok: true, workspaceId: workspace.id };
}
