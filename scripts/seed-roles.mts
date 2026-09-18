/**
 * Seeds the editable roles into every workspace.
 *
 * Dry run by default — it prints what it would write and exits without
 * touching anything. Pass APPLY=1 to commit:
 *
 *   npx tsx scripts/seed-roles.mts                 # show the plan
 *   APPLY=1 npx tsx scripts/seed-roles.mts         # write it
 *   WORKSPACE=virtuosoft APPLY=1 npx tsx …         # target one workspace by slug
 *
 * Idempotent: an existing role of the same name is updated in place rather than
 * duplicated, so re-running is safe.
 *
 * `inheritsFrom` is mandatory. It is what every role-based guard reads — omit
 * it and holders resolve to the least privileged base while the role still
 * looks correct on screen.
 */

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import { buildDatabaseUrl } from "../src/lib/db-config/db-config";
import { PERMISSION_KEYS, permissionsFor } from "../src/lib/permissions";

const APPLY = process.env.APPLY === "1";
const WORKSPACE_SLUG = process.env.WORKSPACE ?? null;

/**
 * The editable roles.
 *
 * `owner` is deliberately absent: it is the one fixed role, held directly as an
 * enum value, and is what guarantees a workspace always has somebody able to
 * restore the others. Every other role is seeded as a row so it can be edited
 * and deleted.
 *
 * Each starts with exactly the permissions its matching base role grants, so
 * seeding changes nothing about who can do what — it only moves the definition
 * from compile-time into data.
 */
const ROLES_TO_SEED = [
  {
    name: "admin",
    label: "Admin",
    inheritsFrom: "ADMIN" as const,
    description: "Runs the workspace day to day. Cannot delete accounts or the workspace.",
  },
  {
    name: "manager",
    label: "Manager",
    inheritsFrom: "MANAGER" as const,
    description: "Leads projects and people, without workspace-level settings.",
  },
  {
    name: "member",
    label: "Member",
    inheritsFrom: "MEMBER" as const,
    description:
      "Standard user. Day-to-day project, task and time-tracking work. No administration.",
  },
  {
    name: "viewer",
    label: "Viewer",
    inheritsFrom: "VIEWER" as const,
    description: "Read-only access, including reports.",
  },
  {
    name: "guest",
    label: "Guest",
    inheritsFrom: "GUEST" as const,
    description: "Sees projects only — typically an external client.",
  },
];

/**
 * Never granted to a custom role, whatever its base allows. `roles.manage` is
 * the escalation route: a holder could edit their own role and grant themselves
 * everything, so the narrowing that makes custom roles safe would not bind them.
 */
const REFUSED = ["roles.manage"];

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(buildDatabaseUrl()) });

  // Each role starts with its base role's full permission set, minus anything
  // a custom role may never hold. Derived rather than hand-listed, so it cannot
  // drift from the matrix.
  const roles = ROLES_TO_SEED.map((role) => {
    const base = role.inheritsFrom.toLowerCase() as
      | "admin"
      | "manager"
      | "member"
      | "viewer"
      | "guest";
    const permissions = (permissionsFor(base) as string[]).filter(
      (permission) => !REFUSED.includes(permission),
    );

    // Would only fire if the matrix and PERMISSION_KEYS ever disagreed.
    const unknown = permissions.filter(
      (permission) => !(PERMISSION_KEYS as string[]).includes(permission),
    );
    if (unknown.length > 0) throw new Error(`Unknown permission(s): ${unknown.join(", ")}`);

    return { ...role, base, permissions };
  });

  const workspaces = await prisma.workspace.findMany({
    where: WORKSPACE_SLUG ? { slug: WORKSPACE_SLUG } : {},
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  if (workspaces.length === 0) {
    console.log(
      WORKSPACE_SLUG
        ? `No workspace with slug "${WORKSPACE_SLUG}".`
        : "No workspaces exist yet — create one first.",
    );
    await prisma.$disconnect();
    return;
  }

  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${workspaces.length} workspace(s)\n`);
  for (const role of roles) {
    console.log(
      `  ${role.name.padEnd(8)} inherits ${role.inheritsFrom.padEnd(8)} ` +
        `${role.permissions.length} permission(s): ${role.permissions.join(", ") || "none"}`,
    );
  }
  console.log("\n  owner and admin are fixed and are not seeded.\n");

  for (const workspace of workspaces) {
    // createdById is nullable in this schema, but stamping it keeps an audit
    // trail; the workspace's earliest owner is the closest thing to an author.
    const owner = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, role: "OWNER" },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });

    for (const role of roles) {
      const existing = await prisma.customRole.findUnique({
        where: { workspaceId_name: { workspaceId: workspace.id, name: role.name } },
        select: { id: true },
      });

      console.log(
        `  ${workspace.slug} — would ${existing ? "update" : "create"} ${role.name}`,
      );

      if (!APPLY) continue;

      const shared = {
        label: role.label,
        description: role.description,
        permissions: role.permissions,
        inheritsFrom: role.inheritsFrom,
        isActive: true,
        updatedById: owner?.userId ?? null,
      };

      if (existing) {
        await prisma.customRole.update({ where: { id: existing.id }, data: shared });
      } else {
        await prisma.customRole.create({
          data: {
            ...shared,
            workspaceId: workspace.id,
            name: role.name,
            // Never a system role: that flag is what disables Edit and Delete,
            // and these are meant to be editable and deletable.
            isSystem: false,
            createdById: owner?.userId ?? null,
          },
        });
      }
    }
  }

  console.log(
    APPLY ? "\nDone." : "\nNothing written. Re-run with APPLY=1 to commit.",
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
