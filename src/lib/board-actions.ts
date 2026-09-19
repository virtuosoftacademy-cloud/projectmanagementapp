"use server";

/**
 * Writes for boards, lists and card placement.
 *
 * Every action re-checks `tasks.manage` and proves the board, list or card
 * belongs to the caller's workspace before touching it — an id alone is never
 * evidence of ownership. Anything that moves a card goes through `moveCard`
 * or `syncTaskList` in `lib/boards.ts`, which keep its status and its list in
 * agreement.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBoardWithLists, listForStatus, moveCard } from "@/lib/boards";
import { TASK_STATUS_VALUES, type TaskStatus } from "@/lib/domain";
import { taskStatusToDb } from "@/lib/mappers";
import { requirePermission } from "@/lib/session";
import { firstError } from "@/lib/validations";

export type ActionResult = { ok: boolean; error?: string; id?: string };

const NOT_FOUND: ActionResult = { ok: false, error: "That no longer exists." };

/** A project may hold this many boards; beyond it the tab strip stops being usable. */
const MAX_BOARDS = 20;
/** And a board this many lists — a horizontal scroll past that is unworkable. */
const MAX_LISTS = 20;

const name = z.string().trim().min(1, "Give it a name.").max(60);
const status = z.enum(TASK_STATUS_VALUES as [string, ...string[]]);

function refresh(projectId: string) {
  revalidatePath(`/projects/project/${projectId}`, "layout");
  revalidatePath("/projects/tasks");
  revalidatePath("/dashboard");
}

async function findBoard(boardId: string, workspaceId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, project: { workspaceId } },
    select: { id: true, projectId: true, name: true },
  });
}

async function findList(listId: string, workspaceId: string) {
  return prisma.boardList.findFirst({
    where: { id: listId, board: { project: { workspaceId } } },
    select: { id: true, boardId: true, position: true, board: { select: { projectId: true } } },
  });
}

// --- Boards ----------------------------------------------------------------

export async function createBoardAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z.object({ projectId: z.string().min(1), name }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, workspaceId: user.workspaceId },
    select: { id: true, _count: { select: { boards: true } } },
  });
  if (!project) return NOT_FOUND;
  if (project._count.boards >= MAX_BOARDS) {
    return { ok: false, error: `A project can hold ${MAX_BOARDS} boards. Delete one first.` };
  }

  // Starts with the four default lists, so a new board is usable immediately
  // rather than an empty canvas that has to be set up before a card fits.
  const board = await createBoardWithLists(
    prisma,
    project.id,
    parsed.data.name,
    project._count.boards,
  );

  refresh(project.id);
  return { ok: true, id: board.id };
}

export async function renameBoardAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z.object({ boardId: z.string().min(1), name }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const board = await findBoard(parsed.data.boardId, user.workspaceId);
  if (!board) return NOT_FOUND;

  await prisma.board.update({ where: { id: board.id }, data: { name: parsed.data.name } });
  refresh(board.projectId);
  return { ok: true };
}

/**
 * Delete a board, moving its cards to the project's first remaining board.
 *
 * Cards are never deleted with a board: they are tasks, with time logged and
 * people assigned. Each lands in the first list on the destination board that
 * shares its status, so nothing changes status in the move.
 */
export async function deleteBoardAction(boardId: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const board = await findBoard(boardId, user.workspaceId);
  if (!board) return NOT_FOUND;

  const target = await prisma.board.findFirst({
    where: { projectId: board.projectId, id: { not: board.id } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "A project needs at least one board." };

  await prisma.$transaction(async (tx) => {
    const cards = await tx.task.findMany({
      where: { list: { boardId: board.id } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, status: true },
    });
    for (const card of cards) {
      const list = await listForStatus(tx, target.id, card.status);
      const last = await tx.task.aggregate({ where: { listId: list.id }, _max: { position: true } });
      await tx.task.update({
        where: { id: card.id },
        data: { listId: list.id, position: (last._max.position ?? -1) + 1 },
      });
    }
    await tx.board.delete({ where: { id: board.id } });
  });

  refresh(board.projectId);
  return { ok: true, id: target.id };
}

// --- Lists -----------------------------------------------------------------

export async function createListAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z.object({ boardId: z.string().min(1), name, status }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const board = await findBoard(parsed.data.boardId, user.workspaceId);
  if (!board) return NOT_FOUND;

  const count = await prisma.boardList.count({ where: { boardId: board.id } });
  if (count >= MAX_LISTS) return { ok: false, error: `A board can hold ${MAX_LISTS} lists.` };

  const list = await prisma.boardList.create({
    data: {
      boardId: board.id,
      name: parsed.data.name,
      status: taskStatusToDb[parsed.data.status as TaskStatus],
      position: count,
    },
    select: { id: true },
  });

  refresh(board.projectId);
  return { ok: true, id: list.id };
}

/**
 * Rename a list, or change which status it counts as.
 *
 * Changing the status re-labels every card on it in the same transaction —
 * otherwise cards would sit on a "Done" list while still counting as in
 * progress, which is precisely the drift the mapping exists to prevent.
 */
export async function updateListAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z.object({ listId: z.string().min(1), name, status }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const list = await findList(parsed.data.listId, user.workspaceId);
  if (!list) return NOT_FOUND;

  const dbStatus = taskStatusToDb[parsed.data.status as TaskStatus];
  await prisma.$transaction([
    prisma.boardList.update({
      where: { id: list.id },
      data: { name: parsed.data.name, status: dbStatus },
    }),
    prisma.task.updateMany({ where: { listId: list.id }, data: { status: dbStatus } }),
  ]);

  refresh(list.board.projectId);
  return { ok: true };
}

/** Move a list one place left or right. */
export async function moveListAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z
    .object({ listId: z.string().min(1), direction: z.union([z.literal(-1), z.literal(1)]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const list = await findList(parsed.data.listId, user.workspaceId);
  if (!list) return NOT_FOUND;

  const lists = await prisma.boardList.findMany({
    where: { boardId: list.boardId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const from = lists.findIndex((item) => item.id === list.id);
  const to = from + parsed.data.direction;
  if (to < 0 || to >= lists.length) return { ok: true };

  const reordered = [...lists];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

  await prisma.$transaction(
    reordered.map((item, position) =>
      prisma.boardList.update({ where: { id: item.id }, data: { position } }),
    ),
  );

  refresh(list.board.projectId);
  return { ok: true };
}

/**
 * Delete an empty list.
 *
 * Refused while it holds cards, with the count, rather than guessing where
 * they should go — the same rule as deleting a workspace or a team. Archived
 * cards do not block it: they leave the list and are re-homed by status the
 * next time the board loads, so none is lost.
 */
export async function deleteListAction(listId: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const list = await findList(listId, user.workspaceId);
  if (!list) return NOT_FOUND;

  const cards = await prisma.task.count({ where: { listId: list.id, archivedAt: null } });
  if (cards) {
    return {
      ok: false,
      error: `Move its ${cards} card${cards === 1 ? "" : "s"} to another list first.`,
    };
  }

  const remaining = await prisma.boardList.count({ where: { boardId: list.boardId } });
  if (remaining <= 1) return { ok: false, error: "A board needs at least one list." };

  await prisma.boardList.delete({ where: { id: list.id } });

  // Close the gap so positions stay a dense run.
  const lists = await prisma.boardList.findMany({
    where: { boardId: list.boardId },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  await prisma.$transaction(
    lists
      .map((item, position) => ({ ...item, next: position }))
      .filter((item) => item.position !== item.next)
      .map((item) => prisma.boardList.update({ where: { id: item.id }, data: { position: item.next } })),
  );

  refresh(list.board.projectId);
  return { ok: true };
}

// --- Cards -----------------------------------------------------------------

/**
 * Move a card to a list and position — a drag, or the card's Move menu.
 *
 * The card takes the list's status, which is what makes the board and every
 * report agree about where work stands.
 */
export async function moveCardAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z
    .object({
      taskId: z.string().min(1),
      listId: z.string().min(1),
      index: z.number().int().min(0).max(10_000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const [task, list] = await Promise.all([
    prisma.task.findFirst({
      where: { id: parsed.data.taskId, project: { workspaceId: user.workspaceId } },
      select: { id: true, projectId: true },
    }),
    findList(parsed.data.listId, user.workspaceId),
  ]);
  if (!task || !list) return NOT_FOUND;

  // A card belongs to its project; a list from another project's board is
  // not somewhere it can go, however the request was put together.
  if (list.board.projectId !== task.projectId) {
    return { ok: false, error: "That list belongs to a different project." };
  }

  await prisma.$transaction((tx) => moveCard(tx, task.id, list.id, parsed.data.index));

  refresh(task.projectId);
  return { ok: true };
}

/** Add a card to the bottom of a list with just a title — Trello's "Add a card". */
export async function addCardAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");
  const parsed = z
    .object({
      listId: z.string().min(1),
      title: z.string().trim().min(1, "Give the card a title.").max(200),
      description: z.string().trim().max(5000).default(""),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const list = await prisma.boardList.findFirst({
    where: { id: parsed.data.listId, board: { project: { workspaceId: user.workspaceId } } },
    select: {
      id: true,
      status: true,
      board: { select: { projectId: true, project: { select: { defaultBillable: true } } } },
    },
  });
  if (!list) return NOT_FOUND;

  const last = await prisma.task.aggregate({ where: { listId: list.id }, _max: { position: true } });
  const task = await prisma.task.create({
    data: {
      projectId: list.board.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: list.status,
      listId: list.id,
      position: (last._max.position ?? -1) + 1,
      billable: list.board.project.defaultBillable,
    },
    select: { id: true },
  });

  refresh(list.board.projectId);
  return { ok: true, id: task.id };
}
