import "server-only";

/**
 * Boards and lists: the one place that keeps a card's status and its list in
 * agreement.
 *
 * The rule every write path relies on is simple — **a task's status is always
 * its list's status**. Moving a card onto a list sets its status; changing a
 * task's status moves it onto a list with that status. Everything that writes
 * either side goes through here, so the two can never drift apart, and every
 * report that reads `Task.status` keeps meaning what it says.
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { TaskStatus as DbTaskStatus } from "@/lib/generated/prisma/enums";
import { taskStatusToDomain } from "@/lib/mappers";
import { TASK_STATUSES, type Board } from "@/lib/domain";

type Db = Prisma.TransactionClient | typeof prisma;

/** The lists a new board starts with: one per status, as the board always looked. */
export const DEFAULT_LISTS: { name: string; status: DbTaskStatus }[] = [
  { name: "To Do", status: "TODO" },
  { name: "In Progress", status: "IN_PROGRESS" },
  { name: "In Review", status: "IN_REVIEW" },
  { name: "Done", status: "DONE" },
];

/** A board with the four default lists. */
export async function createBoardWithLists(db: Db, projectId: string, name: string, position: number) {
  return db.board.create({
    data: {
      projectId,
      name,
      position,
      lists: { create: DEFAULT_LISTS.map((list, index) => ({ ...list, position: index })) },
    },
    select: { id: true },
  });
}

/**
 * The first list on a board that counts as `status`, creating one at the end
 * if the board has none.
 *
 * Creating rather than failing matters: someone may have deleted a board's
 * "Done" list, and marking a card done from the task page must still work.
 * The new list is named after the status, so it is obvious where it came from.
 */
export async function listForStatus(db: Db, boardId: string, status: DbTaskStatus) {
  const existing = await db.boardList.findFirst({
    where: { boardId, status },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (existing) return existing;

  const last = await db.boardList.aggregate({ where: { boardId }, _max: { position: true } });
  const label = TASK_STATUSES.find((item) => item.status === taskStatusToDomain[status])?.label;
  return db.boardList.create({
    data: {
      boardId,
      status,
      name: label ?? status,
      position: (last._max.position ?? -1) + 1,
    },
    select: { id: true },
  });
}

/** The next free position at the bottom of a list. */
async function bottomOf(db: Db, listId: string) {
  const last = await db.task.aggregate({ where: { listId }, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

/**
 * Make sure a project has at least one board, and that every task is on one.
 *
 * Tasks are also created where no board is in view — the workspace-wide Tasks
 * page — and a deleted list leaves its cards unplaced. Rather than teach every
 * create path about boards, unplaced tasks are put on the first board here, in
 * the first list matching their status. Idempotent: it only writes when there
 * is something to fix.
 */
export async function ensureProjectBoards(projectId: string) {
  let first = await prisma.board.findFirst({
    where: { projectId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (!first) first = await createBoardWithLists(prisma, projectId, "Main board", 0);

  const unplaced = await prisma.task.findMany({
    where: { projectId, listId: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, status: true },
  });

  for (const task of unplaced) {
    const list = await listForStatus(prisma, first.id, task.status);
    await prisma.task.update({
      where: { id: task.id },
      data: { listId: list.id, position: await bottomOf(prisma, list.id) },
    });
  }
}

/**
 * Put a task on a list with its current status, if it is not on one already.
 *
 * Called after anything that changes a status without going through a board —
 * the status menu on the task page, the edit dialog, the workspace-wide board.
 * The card stays on its current board where possible, so marking something
 * done does not make it jump to a different board.
 */
export async function syncTaskList(db: Db, taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { status: true, projectId: true, list: { select: { status: true, boardId: true } } },
  });
  if (!task) return;
  if (task.list && task.list.status === task.status) return;

  const boardId =
    task.list?.boardId ??
    (
      await db.board.findFirst({
        where: { projectId: task.projectId },
        orderBy: { position: "asc" },
        select: { id: true },
      })
    )?.id;

  // No board yet: `ensureProjectBoards` places it on the next load.
  if (!boardId) return;

  const list = await listForStatus(db, boardId, task.status);
  await db.task.update({
    where: { id: taskId },
    data: { listId: list.id, position: await bottomOf(db, list.id) },
  });
}

/**
 * Move a card to `listId` at `index`, renumbering both lists so positions stay
 * a dense 0..n run.
 *
 * Dense renumbering rather than fractional positions: lists hold tens of
 * cards, not thousands, so rewriting a column is cheap, and it means positions
 * never need rebalancing later. Archived cards are left out of the count —
 * they are not on screen, so an index from the UI never accounts for them.
 */
export async function moveCard(db: Db, taskId: string, listId: string, index: number) {
  const [task, list] = await Promise.all([
    db.task.findUnique({ where: { id: taskId }, select: { id: true, listId: true } }),
    db.boardList.findUnique({ where: { id: listId }, select: { id: true, status: true } }),
  ]);
  if (!task || !list) return;

  const siblings = await db.task.findMany({
    where: { listId, archivedAt: null, id: { not: taskId } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, position: true },
  });

  const at = Math.max(0, Math.min(index, siblings.length));
  const ordered = [...siblings.slice(0, at), { id: taskId, position: -1 }, ...siblings.slice(at)];

  for (const [position, card] of ordered.entries()) {
    if (card.id === taskId) {
      await db.task.update({
        where: { id: taskId },
        // The status follows the list — this is the whole point of lists
        // mapping to statuses.
        data: { listId, position, status: list.status },
      });
    } else if (card.position !== position) {
      await db.task.update({ where: { id: card.id }, data: { position } });
    }
  }

  // Close the gap the card left behind in its old list.
  if (task.listId && task.listId !== listId) {
    const remaining = await db.task.findMany({
      where: { listId: task.listId, archivedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, position: true },
    });
    for (const [position, card] of remaining.entries()) {
      if (card.position !== position) {
        await db.task.update({ where: { id: card.id }, data: { position } });
      }
    }
  }
}

/** A project's boards with their lists, in order. */
export const getBoards = cache(async (workspaceId: string, projectId: string): Promise<Board[]> => {
  const boards = await prisma.board.findMany({
    where: { projectId, project: { workspaceId } },
    orderBy: { position: "asc" },
    include: { lists: { orderBy: { position: "asc" } } },
  });

  return boards.map((board) => ({
    id: board.id,
    name: board.name,
    position: board.position,
    lists: board.lists.map((list) => ({
      id: list.id,
      name: list.name,
      status: taskStatusToDomain[list.status],
      position: list.position,
    })),
  }));
});
