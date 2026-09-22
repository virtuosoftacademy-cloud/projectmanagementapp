/**
 * The seed: the editable roles, in every workspace. Nothing else.
 *
 * Applies by default, because this is what `npm run db:roles` and Prisma's own
 * seed hook call on deploy. Pass --dry-run to see the plan without writing, or
 * WORKSPACE=<slug> to target one workspace:
 *
 *   npx tsx prisma/seed.ts                     # seed every workspace
 *   npx tsx prisma/seed.ts --dry-run           # show what it would create
 *   WORKSPACE=acme npx tsx prisma/seed.ts      # one workspace by slug
 *
 * There is deliberately no demo data here: a seed that invents workspaces,
 * accounts and projects is a liability the moment it runs anywhere real.
 * Roles are the one thing a workspace cannot work without and cannot create
 * for itself.
 *
 * The definitions live in `src/lib/default-roles.ts`, which is also what
 * workspace creation calls, so a seeded workspace and a newly created one can
 * never disagree. Idempotent and additive: a role already present is left
 * exactly as it is, so re-running never undoes a workspace's own edits.
 *
 * `inheritsFrom` is mandatory. It is what every role-based guard reads — omit
 * it and holders resolve to the least privileged base while the role still
 * looks correct on screen.
 */

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import { buildDatabaseUrl } from "../src/lib/db-config/db-config";
import {
  DEFAULT_ROLES,
  defaultRolePermissions,
  ensureWorkspaceRoles,
} from "../src/lib/default-roles";

const DRY_RUN = process.argv.includes("--dry-run");
const WORKSPACE_SLUG = process.env.WORKSPACE ?? null;

async function main() {
  // The same resolver the app and the Prisma CLI use, so the seed always lands
  // in the database the rest of the project is pointed at: discrete DB_* vars
  // first, DATABASE_URL only as a fallback.
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(buildDatabaseUrl()),
  });

  const workspaces = await prisma.workspace.findMany({
    where: WORKSPACE_SLUG ? { slug: WORKSPACE_SLUG } : {},
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  if (workspaces.length === 0) {
    console.log(
      WORKSPACE_SLUG
        ? `No workspace with slug "${WORKSPACE_SLUG}".`
        : "No workspaces yet — nothing to seed. Roles are created with the workspace.",
    );
    await prisma.$disconnect();
    return;
  }

  console.log(`${DRY_RUN ? "DRY RUN" : "SEEDING"} — ${workspaces.length} workspace(s)\n`);
  for (const { role } of DEFAULT_ROLES) {
    const permissions = defaultRolePermissions(role);
    console.log(
      `  ${role.padEnd(8)} inherits ${role.toUpperCase().padEnd(8)} ` +
        `${permissions.length} permission(s): ${permissions.join(", ") || "none"}`,
    );
  }
  console.log("\n  admin is fixed and is not seeded.\n");

  const names = DEFAULT_ROLES.map(({ role }) => role);

  for (const workspace of workspaces) {
    const present = await prisma.customRole.findMany({
      where: { workspaceId: workspace.id, name: { in: names } },
      select: { name: true },
    });
    const missing = names.filter((role) => !present.some((row) => row.name === role));

    if (missing.length === 0) {
      console.log(`  ${workspace.slug} — all roles already present`);
    } else {
      console.log(
        `  ${workspace.slug} — ${DRY_RUN ? "would create" : "creating"} ${missing.join(", ")}`,
      );
    }

    if (!DRY_RUN) await ensureWorkspaceRoles(prisma, workspace.id);
  }

  console.log(DRY_RUN ? "\nNothing written. Re-run without --dry-run to commit." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
