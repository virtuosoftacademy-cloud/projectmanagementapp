"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/domain";
import { roleToDb, roleToDomain } from "@/lib/mappers";
import { pagesForRole, type AppPage } from "@/lib/permissions";
import { resolveWorkspaceTeamId } from "@/lib/queries";
import { requirePermission } from "@/lib/session";
import {
  addMemberSchema,
  createUserSchema,
  setUserPagesSchema,
  firstError,
  setDisabledSchema,
  updateRoleSchema,
} from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/roles");
  // The roster reads the same data, so role changes, disables and deletes have
  // to invalidate it too — not just the directory they were performed from.
  revalidatePath("/team-members");
  revalidatePath("/settings");
}

/**
 * The two things `roles.manage` alone must not allow, now that admins hold it.
 *
 * Without these an admin could hand themselves the owner role, or grant it to
 * someone else — which would make `roles.manage` a route to every owner-only
 * permission (account deletion) rather than a permission of its own.
 *
 * Returns an error to surface, or null when the change is allowed.
 */
function guardRoleChange(
  actor: { id: string; role: Role },
  targetUserId: string,
  currentRole: string,
  nextRole: string,
): ActionResult | null {
  // Applies to owners too. Changing your own role is how someone ends up
  // locked out of the screen they were standing on, and it is never the
  // intended click — a second owner or admin can do it instead.
  if (actor.id === targetUserId) {
    return { ok: false, error: "You cannot change your own role." };
  }

  if (actor.role === "owner") return null;

  if (nextRole === "owner") {
    return { ok: false, error: "Only an owner can grant the owner role." };
  }
  if (currentRole === "OWNER") {
    return { ok: false, error: "Only an owner can change another owner's role." };
  }

  return null;
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

  const team = await resolveWorkspaceTeamId(data.teamId, actor.workspaceId);
  if (!team.ok) return { ok: false, error: "That team is not in this workspace." };

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone || null,
        designation: data.designation || null,
        teamId: team.teamId,
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

/**
 * Add an account that already exists to the caller's workspace.
 *
 * The counterpart to `createUserAction`: that one makes a new account, this one
 * grants an existing account access here. Kept separate because they differ in
 * what can go wrong — this cannot fail on a duplicate email, but it can race
 * another admin adding the same person, so the membership insert is guarded by
 * a lookup and the composite primary key behind it.
 */
export async function addMemberAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("members.invite");

  const parsed = addMemberSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role") ?? "member",
    teamId: formData.get("teamId") ?? "",
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
  if (!user) return { ok: false, error: "That account no longer exists." };

  const already = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: data.userId } },
  });
  if (already) return { ok: false, error: "They are already in this workspace." };

  const team = await resolveWorkspaceTeamId(data.teamId, actor.workspaceId);
  if (!team.ok) return { ok: false, error: "That team is not in this workspace." };

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: data.userId,
        role: roleToDb[data.role as Role],
      },
    });

    // Only touch their team when one was chosen. `User.teamId` is a single
    // column shared across every workspace they belong to, so silently
    // clearing it here would unassign them elsewhere.
    if (team.teamId) {
      await tx.user.update({ where: { id: data.userId }, data: { teamId: team.teamId } });
    }
  });

  refresh();
  return { ok: true };
}

/**
 * Assign which pages a member may reach. Owners and admins only.
 *
 * Stores the raw selection; `resolvePages` intersects it with the role's own
 * pages at read time rather than at write time, so a later role change is
 * reflected immediately instead of leaving a stale list behind.
 *
 * Assigning *every* page the role allows clears the column back to null —
 * "unrestricted" and "restricted to exactly the default set" behave the same,
 * and storing null keeps them following their role as it changes.
 */
export async function setUserPagesAction(
  userId: string,
  pages: string[],
): Promise<ActionResult> {
  const actor = await requirePermission("members.invite");

  const parsed = setUserPagesSchema.safeParse({ userId, pages });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: data.userId } },
  });
  if (!membership) return { ok: false, error: "They are not in this workspace." };

  // An owner locking themselves out of Users would leave no way back in.
  if (data.userId === actor.id) {
    return { ok: false, error: "You cannot change your own page access." };
  }

  const role = roleToDomain[membership.role];
  const allowed = pagesForRole(role);
  const selected = data.pages.filter((page) => allowed.includes(page as AppPage));
  const unrestricted = selected.length === allowed.length;

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: data.userId } },
    data: { pages: unrestricted ? Prisma.DbNull : selected },
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
  const actor = await requirePermission("members.delete");

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

  const guard = guardRoleChange(actor, parsed.data.userId, membership.role, parsed.data.role);
  if (guard) return guard;

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
