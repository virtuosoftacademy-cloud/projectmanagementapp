"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  SHEET_MAX_COLS,
  SHEET_MAX_PER_PROJECT,
  SHEET_MAX_ROWS,
  normaliseCells,
} from "@/lib/queries";
import { requirePermission } from "@/lib/session";
import { firstError } from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string; sheetId?: string };

const nameSchema = z.string().trim().min(1, "Give the sheet a name.").max(60);

/**
 * Confirms the sheet exists inside the caller's workspace.
 *
 * Every action starts here rather than trusting the id it was handed: a sheet
 * id is opaque, and without this a crafted request could edit another tenant's
 * sheet. Returns the project id, which is what the revalidation needs.
 */
async function findSheet(sheetId: string, workspaceId: string) {
  return prisma.projectSheet.findFirst({
    where: { id: sheetId, project: { workspaceId } },
    select: { id: true, projectId: true },
  });
}

function refresh(projectId: string) {
  revalidatePath(`/projects/project/${projectId}/spreadsheet`);
}

/** Add a sheet to a project. */
export async function createSheetAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = z
    .object({ projectId: z.string().min(1), name: nameSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: data.projectId, workspaceId: user.workspaceId },
    select: { id: true, _count: { select: { sheets: true } } },
  });
  if (!project) return { ok: false, error: "That project no longer exists." };

  // Each sheet is a JSON blob; an unbounded number of them per project would
  // make the tab strip unusable long before it became a storage problem.
  if (project._count.sheets >= SHEET_MAX_PER_PROJECT) {
    return {
      ok: false,
      error: `A project can hold ${SHEET_MAX_PER_PROJECT} sheets. Delete one first.`,
    };
  }

  const created = await prisma.projectSheet.create({
    data: {
      projectId: project.id,
      name: data.name,
      cells: normaliseCells([], 20, 8),
      rowCount: 20,
      colCount: 8,
      position: project._count.sheets,
      updatedById: user.id,
    },
    select: { id: true },
  });

  refresh(project.id);
  return { ok: true, sheetId: created.id };
}

/** Rename a sheet. */
export async function renameSheetAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = z.object({ sheetId: z.string().min(1), name: nameSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const sheet = await findSheet(parsed.data.sheetId, user.workspaceId);
  if (!sheet) return { ok: false, error: "That sheet no longer exists." };

  await prisma.projectSheet.update({
    where: { id: sheet.id },
    data: { name: parsed.data.name, updatedById: user.id },
  });

  refresh(sheet.projectId);
  return { ok: true };
}

/**
 * Assign a sheet to somebody, or to nobody.
 *
 * The assignee must be a member of the *workspace*, checked here rather than
 * trusted — otherwise any user id would be accepted, including someone from
 * another tenant.
 */
export async function assignSheetAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = z
    .object({ sheetId: z.string().min(1), assigneeId: z.string().nullable() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const sheet = await findSheet(data.sheetId, user.workspaceId);
  if (!sheet) return { ok: false, error: "That sheet no longer exists." };

  if (data.assigneeId) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: user.workspaceId, userId: data.assigneeId } },
      select: { userId: true },
    });
    if (!membership) return { ok: false, error: "They are not in this workspace." };
  }

  await prisma.projectSheet.update({
    where: { id: sheet.id },
    data: { assigneeId: data.assigneeId, updatedById: user.id },
  });

  refresh(sheet.projectId);
  return { ok: true };
}

/** Delete a sheet and everything typed into it. */
export async function deleteSheetAction(sheetId: string): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const sheet = await findSheet(sheetId, user.workspaceId);
  if (!sheet) return { ok: false, error: "That sheet no longer exists." };

  await prisma.projectSheet.delete({ where: { id: sheet.id } });

  refresh(sheet.projectId);
  return { ok: true };
}

/**
 * Save a sheet's contents.
 *
 * Sizes and cell length are capped because the grid is one JSON column: without
 * limits a client could post something large enough to make every later read
 * expensive. The grid is re-shaped to `rowCount` × `colCount` server-side, so a
 * ragged array cannot be stored and then break reads.
 */
export async function saveSheetAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = z
    .object({
      sheetId: z.string().min(1),
      rowCount: z.number().int().min(1).max(SHEET_MAX_ROWS),
      colCount: z.number().int().min(1).max(SHEET_MAX_COLS),
      cells: z.array(z.array(z.string().max(500))).max(SHEET_MAX_ROWS),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const sheet = await findSheet(data.sheetId, user.workspaceId);
  if (!sheet) return { ok: false, error: "That sheet no longer exists." };

  await prisma.projectSheet.update({
    where: { id: sheet.id },
    data: {
      cells: normaliseCells(data.cells, data.rowCount, data.colCount),
      rowCount: data.rowCount,
      colCount: data.colCount,
      updatedById: user.id,
    },
  });

  refresh(sheet.projectId);
  return { ok: true };
}
