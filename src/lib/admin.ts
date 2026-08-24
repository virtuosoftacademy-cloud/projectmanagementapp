import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/domain";
import { roleToDomain } from "@/lib/mappers";
import { ROLES } from "@/lib/permissions";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Their role *in the viewing workspace*, or null when they are not in it. */
  role: Role | null;
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
      workspaceMemberships: { where: { workspaceId }, select: { role: true, joinedAt: true } },
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
