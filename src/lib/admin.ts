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
  role: Role;
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
  byRole: Record<Role, number>;
};

/** Every account in `workspaceId`, with the counts the admin screens need. */
export const getAdminUsers = cache(async (workspaceId: string): Promise<AdminUser[]> => {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    include: {
      user: {
        include: {
          _count: { select: { assignedTasks: true, timeEntries: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    phone: row.user.phone,
    role: roleToDomain[row.role],
    designation: row.user.designation,
    teamId: row.user.teamId,
    hourlyRate: row.user.hourlyRate,
    monthlyHours: row.user.monthlyHours,
    joinedAt: row.joinedAt.toISOString().slice(0, 10),
    lastLoginAt: row.user.lastLoginAt ? row.user.lastLoginAt.toISOString().slice(0, 10) : null,
    active: row.user.disabledAt === null,
    taskCount: row.user._count.assignedTasks,
    entryCount: row.user._count.timeEntries,
  }));
});

export const getUserStats = cache(async (workspaceId: string): Promise<UserStats> => {
  const users = await getAdminUsers(workspaceId);

  const byRole = Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<Role, number>;
  for (const user of users) byRole[user.role] += 1;

  return {
    total: users.length,
    active: users.filter((user) => user.active).length,
    inactive: users.filter((user) => !user.active).length,
    byRole,
  };
});
