"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { firstError, teamSchema, updateTeamSchema } from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string };

const NOT_FOUND: ActionResult = { ok: false, error: "That team no longer exists." };

function refresh() {
  revalidatePath("/admin/teams");
  revalidatePath("/admin/users");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

/** Only assign people who are actually in this workspace, however `memberIds` was built. */
async function inWorkspace(workspaceId: string, userIds: string[]) {
  if (userIds.length === 0) return [];
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId, userId: { in: userIds } },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function createTeamAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("workspace.settings");

  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const clash = await prisma.team.findUnique({
    where: { workspaceId_slug: { workspaceId: user.workspaceId, slug: data.slug } },
  });
  if (clash) return { ok: false, error: "Another team already uses that slug." };

  const team = await prisma.team.create({
    data: {
      workspaceId: user.workspaceId,
      name: data.name,
      slug: data.slug,
      code: data.code,
      description: data.description || null,
      color: data.color,
      leadId: data.leadId || null,
    },
  });

  const memberIds = await inWorkspace(user.workspaceId, data.memberIds);
  if (memberIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: memberIds } },
      data: { teamId: team.id },
    });
  }

  refresh();
  return { ok: true };
}

export async function updateTeamAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("workspace.settings");

  const parsed = updateTeamSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.team.findFirst({
    where: { id: data.id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!existing) return NOT_FOUND;

  const clash = await prisma.team.findUnique({
    where: { workspaceId_slug: { workspaceId: user.workspaceId, slug: data.slug } },
  });
  if (clash && clash.id !== data.id) {
    return { ok: false, error: "Another team already uses that slug." };
  }

  await prisma.team.update({
    where: { id: data.id },
    data: {
      name: data.name,
      slug: data.slug,
      code: data.code,
      description: data.description || null,
      color: data.color,
      leadId: data.leadId || null,
    },
  });

  // Membership is a column on User, so syncing means clearing everyone who is
  // no longer selected and stamping everyone who now is.
  await prisma.user.updateMany({
    where: { teamId: data.id, id: { notIn: data.memberIds } },
    data: { teamId: null },
  });
  const memberIds = await inWorkspace(user.workspaceId, data.memberIds);
  if (memberIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: memberIds } },
      data: { teamId: data.id },
    });
  }

  refresh();
  return { ok: true };
}

/**
 * Delete a team.
 *
 * Refused while the team still has active members or owns projects — those
 * records would otherwise be silently orphaned (`onDelete: SetNull` would blank
 * their team without telling anyone). Disabled accounts do not block, since
 * they are already out of use.
 */
export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  const user = await requirePermission("workspace.settings");

  const team = await prisma.team.findFirst({
    where: { id: teamId, workspaceId: user.workspaceId },
    select: {
      name: true,
      _count: {
        select: {
          members: { where: { disabledAt: null } },
          projects: true,
        },
      },
    },
  });
  if (!team) return NOT_FOUND;

  const { members: activeMembers, projects } = team._count;
  if (activeMembers > 0 || projects > 0) {
    const blockers = [
      activeMembers > 0
        ? `${activeMembers} active ${activeMembers === 1 ? "user" : "users"}`
        : null,
      projects > 0 ? `${projects} ${projects === 1 ? "project" : "projects"}` : null,
    ].filter(Boolean);

    return {
      ok: false,
      error: `${team.name} still has ${blockers.join(" and ")}. Move ${
        blockers.length > 1 ? "them" : "those"
      } to another team first.`,
    };
  }

  await prisma.team.delete({ where: { id: teamId } });

  refresh();
  return { ok: true };
}
