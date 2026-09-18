import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { roleToDomain } from "@/lib/mappers";
import { resolveBaseRole, resolveCustomRole, type ResolvedRole } from "@/lib/permissions";

/**
 * The database-backed half of role resolution.
 *
 * The pure half — `resolveBaseRole`, `resolveCustomRole` and the ceiling they
 * enforce — lives in `lib/permissions.ts` beside the matrix it reads, so it can
 * be exercised without a database and imported from client components.
 *
 * Two kinds of role exist:
 *
 *   **Base roles** — the six values of the `Role` enum, built in, with
 *   permissions from the compile-time matrix. Resolving one is a pure function
 *   call; this module is only involved because the membership must be read to
 *   discover which kind it is.
 *
 *   **Custom roles** — rows in `CustomRole`, created by an owner or admin, with
 *   their own permission list and a mandatory `inheritsFrom` base role.
 */

/**
 * The resolved role for one membership.
 *
 * `cache()` dedupes this within a single request and no further. A longer-lived
 * cache would keep serving old permissions after an owner edited a role — stale
 * authorization is both easy to miss and hard to debug, and the query is a
 * single indexed primary-key lookup.
 */
export const resolveMemberRole = cache(
  async (workspaceId: string, userId: string): Promise<ResolvedRole | null> => {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: {
        role: true,
        customRole: {
          select: {
            id: true,
            name: true,
            label: true,
            permissions: true,
            inheritsFrom: true,
            isActive: true,
          },
        },
      },
    });

    if (!membership) return null;

    const base = roleToDomain[membership.role];
    const custom = membership.customRole;

    // A deactivated role falls back to its base rather than locking the holder
    // out: deactivating is for retiring a role, not for silently stripping
    // access from whoever still holds it.
    if (!custom || !custom.isActive) return resolveBaseRole(base);

    return resolveCustomRole({
      id: custom.id,
      name: custom.name,
      label: custom.label,
      permissions: custom.permissions,
      inheritsFrom: roleToDomain[custom.inheritsFrom],
    });
  },
);
