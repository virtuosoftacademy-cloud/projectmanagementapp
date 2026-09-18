"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/domain";
import { roleToDb } from "@/lib/mappers";
import { permissionsFor, type Permission } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { customRoleSchema, firstError } from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string; roleId?: string };

function refresh() {
  revalidatePath("/admin/users/roles");
  revalidatePath("/admin/users");
  revalidatePath("/team-members");
  revalidatePath("/settings");
}

/**
 * Permissions a custom role may never hold, whatever its base role allows.
 *
 * `roles.manage` is the escalation route: a holder could edit their own role,
 * grant themselves everything, and the narrowing that makes custom roles safe
 * would no longer bound them. Managing roles stays with the base owner role.
 */
const FORBIDDEN_IN_CUSTOM_ROLES: Permission[] = ["roles.manage"];

/**
 * Validates a submitted role and returns the permissions it may actually hold.
 *
 * Two ceilings apply, in this order: the base role it inherits from, then the
 * forbidden list above. Both are applied server-side rather than trusted from
 * the form, because the form is the half an attacker skips.
 */
function sanitisePermissions(inheritsFrom: Role, requested: string[]) {
  const ceiling = permissionsFor(inheritsFrom).filter(
    (permission) => !FORBIDDEN_IN_CUSTOM_ROLES.includes(permission),
  );
  const granted = ceiling.filter((permission) => requested.includes(permission));

  const refused = requested.filter(
    (permission) => FORBIDDEN_IN_CUSTOM_ROLES.includes(permission as Permission),
  );

  return { granted, refused };
}

/** Create a role in the caller's workspace. Owners and admins only. */
export async function createCustomRoleAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission("workspace.settings");

  const parsed = customRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const clash = await prisma.customRole.findUnique({
    where: { workspaceId_name: { workspaceId: actor.workspaceId, name: data.name } },
  });
  if (clash) return { ok: false, error: "A role with that name already exists here." };

  const { granted, refused } = sanitisePermissions(data.inheritsFrom as Role, data.permissions);
  if (refused.length > 0) {
    return { ok: false, error: "Managing roles cannot be granted to a custom role." };
  }

  const created = await prisma.customRole.create({
    data: {
      workspaceId: actor.workspaceId,
      name: data.name,
      label: data.label,
      description: data.description,
      permissions: granted,
      inheritsFrom: roleToDb[data.inheritsFrom as Role],
      isActive: true,
      isSystem: false,
      createdById: actor.id,
      updatedById: actor.id,
    },
  });

  refresh();
  return { ok: true, roleId: created.id };
}

/** Edit a role. Owners and admins only; system roles are read-only. */
export async function updateCustomRoleAction(
  roleId: string,
  input: unknown,
): Promise<ActionResult> {
  const actor = await requirePermission("workspace.settings");

  const parsed = customRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.customRole.findFirst({
    where: { id: roleId, workspaceId: actor.workspaceId },
  });
  if (!existing) return { ok: false, error: "That role no longer exists." };
  if (existing.isSystem) return { ok: false, error: "System roles cannot be edited." };

  if (data.name !== existing.name) {
    const clash = await prisma.customRole.findUnique({
      where: { workspaceId_name: { workspaceId: actor.workspaceId, name: data.name } },
    });
    if (clash) return { ok: false, error: "A role with that name already exists here." };
  }

  const { granted, refused } = sanitisePermissions(data.inheritsFrom as Role, data.permissions);
  if (refused.length > 0) {
    return { ok: false, error: "Managing roles cannot be granted to a custom role." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.customRole.update({
      where: { id: roleId },
      data: {
        name: data.name,
        label: data.label,
        description: data.description,
        permissions: granted,
        inheritsFrom: roleToDb[data.inheritsFrom as Role],
        updatedById: actor.id,
      },
    });

    // Members carry the base role alongside the custom one so role filters work
    // without a join — so changing what a role inherits has to restamp them.
    await tx.workspaceMember.updateMany({
      where: { workspaceId: actor.workspaceId, customRoleId: roleId },
      data: { role: roleToDb[data.inheritsFrom as Role] },
    });
  });

  refresh();
  return { ok: true, roleId };
}

/**
 * Delete a role. Owners and admins only.
 *
 * Holders are not deleted with it: the foreign key is `SetNull`, so they fall
 * back to the base role the membership already carries. That is a demotion in
 * effect, which is why the dialog says how many people it affects.
 */
export async function deleteCustomRoleAction(roleId: string): Promise<ActionResult> {
  const actor = await requirePermission("workspace.settings");

  const existing = await prisma.customRole.findFirst({
    where: { id: roleId, workspaceId: actor.workspaceId },
    include: { _count: { select: { members: true } } },
  });
  if (!existing) return { ok: false, error: "That role no longer exists." };
  if (existing.isSystem) return { ok: false, error: "System roles cannot be deleted." };

  await prisma.customRole.delete({ where: { id: roleId } });

  refresh();
  return { ok: true };
}

/** Give a member a custom role, or return them to a plain base role. */
export async function assignCustomRoleAction(
  userId: string,
  roleId: string | null,
): Promise<ActionResult> {
  const actor = await requirePermission("workspace.settings");

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId } },
  });
  if (!membership) return { ok: false, error: "They are not in this workspace." };
  if (userId === actor.id) return { ok: false, error: "You cannot change your own role." };

  if (roleId === null) {
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId } },
      data: { customRoleId: null },
    });
    refresh();
    return { ok: true };
  }

  const role = await prisma.customRole.findFirst({
    where: { id: roleId, workspaceId: actor.workspaceId, isActive: true },
  });
  if (!role) return { ok: false, error: "That role is not available in this workspace." };

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: actor.workspaceId, userId } },
    // Base role restamped to match, for the same reason as in the update above.
    data: { customRoleId: role.id, role: role.inheritsFrom },
  });

  refresh();
  return { ok: true };
}
