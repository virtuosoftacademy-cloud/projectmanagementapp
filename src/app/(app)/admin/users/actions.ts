"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/domain";
import { roleToDb } from "@/lib/mappers";
import { requirePermission } from "@/lib/session";
import {
  createUserSchema,
  firstError,
  setDisabledSchema,
  updateRoleSchema,
} from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/roles");
  revalidatePath("/settings");
}

/** Owner count for a workspace, restricted to accounts that can still sign in. */
async function activeOwnerCount(workspaceId: string) {
  return prisma.workspaceMember.count({
    where: { workspaceId, role: "OWNER", user: { disabledAt: null } },
  });
}

/** Create an account and add it to the caller's workspace. Owners and admins only. */
export async function createUserAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission("members.invite");

  // The form validated with this same schema; parsing again is what actually
  // protects the database, since a client can post anything.
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { ok: false, error: "Someone already uses that email." };

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone || null,
        designation: data.designation || null,
        hourlyRate: data.hourlyRate,
        monthlyHours: data.monthlyHours,
        passwordHash: await bcrypt.hash(data.password, 12),
        disabledAt: data.active ? null : new Date(),
        lastWorkspaceId: actor.workspaceId,
      },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: actor.workspaceId, userId: created.id, role: roleToDb[data.role as Role] },
    });
  });

  refresh();
  return { ok: true };
}

/** Enable or disable sign-in for several accounts at once. */
export async function setUsersDisabledAction(
  userIds: string[],
  disabled: boolean,
): Promise<ActionResult> {
  const actor = await requirePermission("members.invite");

  const parsed = setDisabledSchema.safeParse({ userIds, disabled });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: actor.workspaceId, userId: { in: parsed.data.userIds } },
    select: { userId: true },
  });
  const targets = members.map((m) => m.userId).filter((id) => id !== actor.id);
  if (targets.length === 0) {
    return { ok: false, error: "You cannot change your own account here." };
  }

  if (parsed.data.disabled) {
    // Never lock this workspace out of its last usable owner.
    const owners = await prisma.workspaceMember.findMany({
      where: { workspaceId: actor.workspaceId, role: "OWNER", user: { disabledAt: null } },
      select: { userId: true },
    });
    const remaining = owners.filter((owner) => !targets.includes(owner.userId));
    if (owners.length > 0 && remaining.length === 0) {
      return { ok: false, error: "At least one owner must stay active." };
    }
  }

  await prisma.user.updateMany({
    where: { id: { in: targets } },
    data: { disabledAt: parsed.data.disabled ? new Date() : null },
  });

  refresh();
  return { ok: true };
}

/**
 * Permanently delete an account. Owners only, never the last owner of this
 * workspace, and only for someone who is actually in it.
 *
 * This still deletes the whole account, not just this workspace's membership
 * — the same account-level delete the app had before workspaces existed — so
 * it also removes the person from every other workspace they belong to. A
 * "remove from this workspace only" action would be a reasonable follow-up
 * but is a distinct feature from what's built here.
 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const actor = await requirePermission("roles.manage");

  if (userId === actor.id) return { ok: false, error: "You cannot delete your own account." };

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId } },
  });
  if (!membership) return { ok: false, error: "That account no longer exists." };

  if (membership.role === "OWNER") {
    const owners = await activeOwnerCount(actor.workspaceId);
    if (owners <= 1) return { ok: false, error: "The workspace must keep at least one owner." };
  }

  // Task assignments and time entries cascade — deleting an account erases the
  // hours it logged, which is why the confirm dialog shows those counts.
  await prisma.user.delete({ where: { id: userId } });

  refresh();
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true };
}

/** Change a single user's role in this workspace. Owner-only. */
export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  const actor = await requirePermission("roles.manage");

  const parsed = updateRoleSchema.safeParse({ userId, role });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: parsed.data.userId } },
  });
  if (!membership) return { ok: false, error: "That account no longer exists." };

  if (membership.role === "OWNER" && parsed.data.role !== "owner") {
    const owners = await activeOwnerCount(actor.workspaceId);
    if (owners <= 1) return { ok: false, error: "The workspace must keep at least one owner." };
  }

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: parsed.data.userId } },
    data: { role: roleToDb[parsed.data.role as Role] },
  });

  refresh();
  return { ok: true };
}
