import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/domain";
import { roleToDomain } from "@/lib/mappers";
import { ROLES, resolveCustomRole, type Permission } from "@/lib/permissions";


export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Their role *in the viewing workspace*, or null when they are not in it. */
  role: Role | null;
  /** The custom role they hold here, if any. `role` is what it inherits from. */
  customRole: { id: string; name: string; label: string } | null;
  /** Pages assigned to them in this workspace; null when never restricted. */
  pages: string[] | null;
  /** False for accounts that exist but hold no membership in this workspace. */
  inWorkspace: boolean;
  designation: string | null;
  teamId: string | null;
  hourlyRate: number;
  monthlyHours: number;
  joinedAt: string;
  lastLoginAt: string | null;
  active: boolean;
  /** Work that would be orphaned if the account were deleted. */
  taskCount: number;
  entryCount: number;
};

export type UserStats = {
  total: number;
  active: number;
  inactive: number;
  /** How many of `total` actually hold a membership in the viewing workspace. */
  inWorkspace: number;
  byRole: Record<Role, number>;
};

/**
 * Every account in the system, annotated with its role in `workspaceId`.
 *
 * Deliberately **not** workspace-scoped: the admin Users screen is a directory
 * of all accounts, so people who belong to another workspace still appear —
 * with `role: null` and `inWorkspace: false`, never with a borrowed role.
 *
 * The management actions stay scoped: `setUserRoleAction`, `deleteUserAction`
 * and `setUsersDisabledAction` all look the target up by
 * `workspaceId_userId` and refuse anyone who is not a member, so listing an
 * outsider here does not make them administrable from here.
 */
export const getAdminUsers = cache(async (workspaceId: string): Promise<AdminUser[]> => {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { assignedTasks: true, timeEntries: true } },
      workspaceMemberships: {
        where: { workspaceId },
        select: {
          role: true,
          joinedAt: true,
          pages: true,
          customRole: { select: { id: true, name: true, label: true } },
        },
      },
    },
  });

  return users.map((user) => {
    const membership = user.workspaceMemberships[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: membership ? roleToDomain[membership.role] : null,
      customRole: membership?.customRole ?? null,
      pages: Array.isArray(membership?.pages) ? (membership.pages as string[]) : null,
      inWorkspace: Boolean(membership),
      designation: user.designation,
      teamId: user.teamId,
      hourlyRate: user.hourlyRate,
      monthlyHours: user.monthlyHours,
      // Joined *this workspace* when they are in it; otherwise when the account
      // itself was created, which is the only join date that means anything.
      joinedAt: (membership?.joinedAt ?? user.joinedAt).toISOString().slice(0, 10),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString().slice(0, 10) : null,
      active: user.disabledAt === null,
      taskCount: user._count.assignedTasks,
      entryCount: user._count.timeEntries,
    };
  });
});

export const getUserStats = cache(async (workspaceId: string): Promise<UserStats> => {
  const users = await getAdminUsers(workspaceId);

  const byRole = Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<Role, number>;
  for (const user of users) if (user.role) byRole[user.role] += 1;

  return {
    total: users.length,
    active: users.filter((user) => user.active).length,
    inactive: users.filter((user) => !user.active).length,
    inWorkspace: users.filter((user) => user.inWorkspace).length,
    byRole,
  };
});

/**
 * Only the people who hold a membership in `workspaceId` — that is, the accounts
 * an owner or admin has actually added to this workspace.
 *
 * The Users screen under Administration is a directory of *every* account, so
 * outsiders show there with `role: null`. The Team Members roster is the
 * opposite question: who is on this team? Anyone without a `WorkspaceMember`
 * row was never added by an owner or admin and does not belong on it.
 *
 * Built on `getAdminUsers`, which is `cache()`d per request — so a page showing
 * both the roster and the directory pays for one query, not two.
 */
export const getTeamMembers = cache(async (workspaceId: string): Promise<AdminUser[]> => {
  const users = await getAdminUsers(workspaceId);
  return users.filter((user) => user.inWorkspace);
});

/**
 * Accounts that exist but hold no membership in `workspaceId` — the people an
 * owner or admin can add to this workspace.
 *
 * The counterpart to `getTeamMembers`: between them they partition every
 * account into "already on the team" and "could be added". Someone already in
 * the workspace is excluded so the picker cannot offer a duplicate, which the
 * composite primary key on WorkspaceMember would reject anyway.
 */
export const getAddableUsers = cache(async (workspaceId: string): Promise<AdminUser[]> => {
  const users = await getAdminUsers(workspaceId);
  return users.filter((user) => !user.inWorkspace);
});

export type CustomRoleRow = {
  id: string;
  name: string;
  label: string;
  description: string;
  /** Already intersected with the base role's ceiling by `resolveCustomRole`. */
  permissions: Permission[];
  inheritsFrom: Role;
  isActive: boolean;
  isSystem: boolean;
  memberCount: number;
};

/**
 * The roles an owner or admin has defined in this workspace.
 *
 * Permissions come back resolved rather than raw, so the count shown on the
 * roles screen is what the role actually grants — a permission stored on the
 * row but absent from its base role is dropped here, exactly as it would be at
 * request time.
 */
export const getCustomRoles = cache(async (workspaceId: string): Promise<CustomRoleRow[]> => {
  const rows = await prisma.customRole.findMany({
    where: { workspaceId },
    orderBy: { label: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return rows.map((row) => {
    const resolved = resolveCustomRole({
      id: row.id,
      name: row.name,
      label: row.label,
      permissions: row.permissions,
      inheritsFrom: roleToDomain[row.inheritsFrom],
    });

    return {
      id: row.id,
      name: row.name,
      label: row.label,
      description: row.description,
      permissions: resolved.permissions,
      inheritsFrom: resolved.effectiveRole,
      isActive: row.isActive,
      isSystem: row.isSystem,
      memberCount: row._count.members,
    };
  });
});
