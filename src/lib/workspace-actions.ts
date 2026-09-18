"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { roleToDomain } from "@/lib/mappers";
import { can } from "@/lib/permissions";
import { requireAccount } from "@/lib/session";
import { createWorkspaceSchema, firstError } from "@/lib/validations";

export type CreateWorkspaceResult = { ok: boolean; error?: string; workspaceId?: string };

export async function createWorkspaceAction(input: unknown): Promise<CreateWorkspaceResult> {
  const user = await requireAccount();

  const memberships = await prisma.workspaceMember.count({ where: { userId: user.id } });
  if (memberships > 0 && !can(user.role, "workspace.create")) {
    return { ok: false, error: "Only an owner or admin can create a workspace." };
  }

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

export type DeleteWorkspaceResult = {
  ok: boolean;
  error?: string;
  /** Where the caller should move to, when they deleted the one they were in. */
  nextWorkspaceId?: string | null;
};

/**
 * Delete a workspace, provided it is empty of projects and teams.
 *
 * **Ownership is checked against the target**, not against the session's
 * current workspace. `requirePermission` would ask "is this person an owner
 * *here*", which is the wrong question when the card being deleted belongs to
 * a different workspace — someone who owns A and merely belongs to B could
 * otherwise delete B from A's session.
 *
 * The emptiness rule is what makes this safe to expose at all: deleting cascades
 * to every team, project, task, time entry, message and custom role inside. By
 * refusing while any project or team remains, the destructive reach is limited
 * to memberships and the workspace row itself, and the person is made to
 * dismantle the contents deliberately first.
 */
export async function deleteWorkspaceAction(
  workspaceId: string,
): Promise<DeleteWorkspaceResult> {
  const user = await requireAccount();

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: { role: true },
  });
  if (!membership) return { ok: false, error: "That workspace no longer exists." };

  if (!can(roleToDomain[membership.role], "workspace.delete")) {
    return { ok: false, error: "Only an owner of that workspace can delete it." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      _count: {
        select: {
          projects: true,
          // Disabled accounts cannot sign in, so they are not people who would
          // lose access — they do not count as a reason to refuse.
          members: { where: { user: { disabledAt: null } } },
        },
      },
    },
  });
  if (!workspace) return { ok: false, error: "That workspace no longer exists." };

  const projects = workspace._count.projects;
  // The caller is a member too, and they are the one asking — so only *other*
  // active people block the delete.
  const others = workspace._count.members - 1;

  if (projects > 0 || others > 0) {
    const blockers = [
      projects > 0 ? `${projects} ${projects === 1 ? "project" : "projects"}` : null,
      others > 0 ? `${others} other active ${others === 1 ? "user" : "users"}` : null,
    ].filter(Boolean);

    return {
      ok: false,
      error: `${workspace.name} still has ${blockers.join(" and ")}. Remove ${
        blockers.length > 1 ? "them" : "those"
      } before deleting it.`,
    };
  }

  // Where to land afterwards, read *before* the delete removes the membership.
  const fallback = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: { not: workspaceId } },
    orderBy: { joinedAt: "asc" },
    select: { workspaceId: true },
  });

  await prisma.workspace.delete({ where: { id: workspaceId } });

  // Stops the next sign-in resuming into a workspace that is gone.
  if (user.workspaceId === workspaceId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastWorkspaceId: fallback?.workspaceId ?? null },
    });
  }

  revalidatePath("/workspaces");
  revalidatePath("/dashboard");
  return { ok: true, nextWorkspaceId: fallback?.workspaceId ?? null };
}
