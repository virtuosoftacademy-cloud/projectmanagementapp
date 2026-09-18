"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/domain";
import { roleToDb } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceTeamId } from "@/lib/queries";
import { requirePermission } from "@/lib/session";
import {
  firstError,
  inviteMemberSchema,
  updateRoleSchema,
  updateWorkspaceSchema,
} from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string };

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/admin/users");
}

async function activeOwnerCount(workspaceId: string) {
  return prisma.workspaceMember.count({
    where: { workspaceId, role: "OWNER", user: { disabledAt: null } },
  });
}

/** Change a member's role in this workspace. Owner-only, and the last owner cannot be demoted. */
export async function updateRoleAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("roles.manage");

  const parsed = updateRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: parsed.data.userId } },
  });
  if (!membership) return { ok: false, error: "That member no longer exists." };

  // Same guard as `setUserRoleAction`. `roles.manage` is owner *and* admin, so
  // without this an admin could grant themselves the owner role and pick up
  // account deletion with it.
  if (parsed.data.userId === actor.id) {
    return { ok: false, error: "You cannot change your own role." };
  }
  if (actor.role !== "owner") {
    if (parsed.data.role === "owner") {
      return { ok: false, error: "Only an owner can grant the owner role." };
    }
    if (membership.role === "OWNER") {
      return { ok: false, error: "Only an owner can change another owner's role." };
    }
  }

  if (membership.role === "OWNER" && parsed.data.role !== "owner") {
    const owners = await activeOwnerCount(actor.workspaceId);
    if (owners <= 1) {
      return { ok: false, error: "The workspace must keep at least one owner." };
    }
  }

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId: parsed.data.userId } },
    data: { role: roleToDb[parsed.data.role as Role] },
  });

  // The role lives in the target's JWT, so it takes effect on their next
  // session refresh rather than instantly.
  refresh();

  return { ok: true };
}

/** Invite a member into this workspace. Owners and admins only. */
export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("members.invite");

  const parsed = inviteMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role") ?? "member",
    // Only the Team Members dialog offers a team picker; the settings card
    // posts no such field, which parses to "" and means "no team".
    teamId: formData.get("teamId") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { ok: false, error: "Someone already uses that email." };

  const team = await resolveWorkspaceTeamId(data.teamId, actor.workspaceId);
  if (!team.ok) return { ok: false, error: "That team is not in this workspace." };

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        teamId: team.teamId,
        passwordHash: data.password ? await bcrypt.hash(data.password, 12) : null,
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

/** Disable or re-enable sign-in for a member of this workspace. Owners and admins only. */
export async function setMemberDisabledAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("members.invite");

  const userId = String(formData.get("userId") ?? "");
  const disabled = String(formData.get("disabled") ?? "") === "true";

  if (!userId) return { ok: false, error: "Pick a member." };
  if (userId === actor.id) return { ok: false, error: "You cannot disable your own account." };

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId } },
  });
  if (!membership) return { ok: false, error: "That member no longer exists." };

  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: disabled ? new Date() : null },
  });

  refresh();
  return { ok: true };
}

/** Rename or re-describe the current workspace. Owners and admins only. */
export async function updateWorkspaceAction(formData: FormData): Promise<ActionResult> {
  const actor = await requirePermission("workspace.settings");

  const parsed = updateWorkspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  await prisma.workspace.update({
    where: { id: actor.workspaceId },
    data: { name: parsed.data.name, description: parsed.data.description },
  });

  revalidatePath("/settings");
  return { ok: true };
}
