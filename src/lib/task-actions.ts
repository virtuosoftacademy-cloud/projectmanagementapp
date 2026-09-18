"use server";

/**
 * Writes for tasks, labels, time tracking and attachments.
 *
 * Split out of `lib/actions.ts` because this is a feature's worth of writes on
 * its own — the same split `lib/workspace-actions.ts` already makes. The rules
 * from `lib/actions.ts` still hold: every action re-checks the caller's
 * permission server-side, and every action that touches an existing row proves
 * the row belongs to the caller's workspace before mutating it, because an id
 * on its own is never evidence of ownership.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hoursToMinutes } from "@/lib/domain";
import { formatMinutes } from "@/lib/duration";
import { isoToDate, priorityToDb, taskStatusToDb } from "@/lib/mappers";
import { validateImageFile } from "@/lib/r2";
import { deleteFromR2, isR2Configured, uploadImageToR2 } from "@/lib/r2-server";
import { requirePermission, viewerCan } from "@/lib/session";
import {
  archiveTaskSchema,
  firstError,
  labelSchema,
  manualTimeEntrySchema,
  startTimerSchema,
  updateLabelSchema,
  updateTaskSchema,
  updateTimeEntrySchema,
} from "@/lib/validations";
import type { Priority, TaskStatus } from "@/lib/domain";

export type ActionResult = { ok: boolean; error?: string };


const NOT_FOUND: ActionResult = { ok: false, error: "That record no longer exists." };

/**
 * A minute is the smallest unit `TimeEntry` stores, so a shorter timer has
 * nothing to record. Stopping one is treated as discarding it rather than
 * saving a zero — a row of no duration is noise in every total and report it
 * later appears in.
 */
const MIN_TRACKED_SECONDS = 60;

function refreshTask(projectId: string, taskId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects/tasks");
  revalidatePath("/projects/time-tracking");
  revalidatePath("/projects/timesheet");
  revalidatePath("/projects/analytics");
  revalidatePath(`/projects/project/${projectId}`, "layout");
  if (taskId) revalidatePath(`/projects/project/${projectId}/tasks/${taskId}`);
}

/**
 * Notes something in the workspace activity feed.
 *
 * Best-effort by design: a failure to write the log must not fail the action
 * that succeeded. Losing a feed line is a much smaller problem than telling
 * somebody their time was not recorded when it was.
 */
async function recordActivity(
  user: { id: string; workspaceId: string },
  action: string,
  target: string,
) {
  try {
    await prisma.activityEntry.create({
      data: { workspaceId: user.workspaceId, userId: user.id, action, target, at: new Date() },
    });
  } catch {
    // Deliberately swallowed — see above.
  }
}

/** The task, if it is in the caller's workspace. Null is "no such task, to you". */
async function findTask(taskId: string, workspaceId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId } },
    select: { id: true, projectId: true, billable: true, title: true },
  });
}

// --- Tasks -----------------------------------------------------------------

/**
 * Edit an existing task.
 *
 * Assignees and labels are replaced wholesale inside a transaction rather than
 * diffed: the form always submits the complete set, and a delete-then-create
 * that is not atomic could leave a task with none of either if the second half
 * failed.
 */
export async function updateTaskAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const task = await findTask(data.taskId, user.workspaceId);
  if (!task) return NOT_FOUND;

  // Both lists are ids the client chose, so confirm each one is real and in
  // this workspace before writing it — otherwise a crafted request could
  // assign a task to somebody in another tenant.
  const [members, labels] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: user.workspaceId, userId: { in: data.assigneeIds } },
      select: { userId: true },
    }),
    prisma.label.findMany({
      where: { workspaceId: user.workspaceId, id: { in: data.labelIds } },
      select: { id: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.taskAssignee.deleteMany({ where: { taskId: task.id } }),
    prisma.taskLabel.deleteMany({ where: { taskId: task.id } }),
    prisma.task.update({
      where: { id: task.id },
      data: {
        title: data.title,
        description: data.description,
        status: taskStatusToDb[data.status as TaskStatus],
        priority: priorityToDb[data.priority as Priority],
        estimateMinutes: hoursToMinutes(data.estimateHours),
        billable: data.billable,
        dueDate: isoToDate(data.dueDate),
        assignees: { create: members.map((row) => ({ userId: row.userId })) },
        labels: { create: labels.map((row) => ({ labelId: row.id })) },
      },
    }),
  ]);

  refreshTask(task.projectId, task.id);
  return { ok: true };
}

/**
 * Archive a task, or restore it.
 *
 * Archiving is offered instead of deletion because a task's time entries are
 * someone's recorded work: deleting the task cascades them away, silently
 * changing hours that have already been reported on. Archiving takes the task
 * off the board and leaves the history intact.
 */
export async function archiveTaskAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const parsed = archiveTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const task = await findTask(parsed.data.taskId, user.workspaceId);
  if (!task) return NOT_FOUND;

  // Archiving something that is being timed would strand the timer on a task
  // nobody can see; stop it first so the work so far is still recorded.
  if (parsed.data.archived) {
    await stopTimersOnTask(task.id);
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { archivedAt: parsed.data.archived ? new Date() : null },
  });

  await recordActivity(user, parsed.data.archived ? "archived" : "restored", task.title);
  refreshTask(task.projectId, task.id);
  return { ok: true };
}

// --- Labels ----------------------------------------------------------------

export async function createLabelAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const parsed = labelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const clash = await prisma.label.findFirst({
    where: { workspaceId: user.workspaceId, name: parsed.data.name },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "A label with that name already exists." };

  await prisma.label.create({
    data: { ...parsed.data, workspaceId: user.workspaceId },
  });

  revalidatePath("/projects", "layout");
  return { ok: true };
}

export async function updateLabelAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const parsed = updateLabelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const label = await prisma.label.findFirst({
    where: { id: data.id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!label) return NOT_FOUND;

  const clash = await prisma.label.findFirst({
    where: { workspaceId: user.workspaceId, name: data.name, id: { not: data.id } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "A label with that name already exists." };

  await prisma.label.update({
    where: { id: label.id },
    data: { name: data.name, color: data.color },
  });

  revalidatePath("/projects", "layout");
  return { ok: true };
}

/** Deleting a label takes it off every task; the tasks themselves are untouched. */
export async function deleteLabelAction(id: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const label = await prisma.label.findFirst({
    where: { id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!label) return NOT_FOUND;

  await prisma.label.delete({ where: { id: label.id } });

  revalidatePath("/projects", "layout");
  return { ok: true };
}

// --- Timer -----------------------------------------------------------------

/**
 * Turns a running timer into a real time entry.
 *
 * Shared by "stop" and by "start something else", because those must record
 * time identically — a timer you forgot to stop before switching tasks is not
 * worth less than one you stopped deliberately.
 *
 * Returns the minutes written, or 0 when the run was too short to keep.
 */
async function commitTimer(timer: {
  id: string;
  taskId: string;
  userId: string;
  startedAt: Date;
  note: string;
}) {
  const endedAt = new Date();
  const seconds = Math.floor((endedAt.getTime() - timer.startedAt.getTime()) / 1000);

  if (seconds < MIN_TRACKED_SECONDS) {
    await prisma.taskTimer.delete({ where: { id: timer.id } });
    return 0;
  }

  const task = await prisma.task.findUnique({
    where: { id: timer.taskId },
    select: { billable: true },
  });

  const minutes = Math.round(seconds / 60);

  // One transaction: the entry and the timer's removal have to happen together,
  // or a retry would double-count the same stretch of work.
  await prisma.$transaction([
    prisma.timeEntry.create({
      data: {
        taskId: timer.taskId,
        userId: timer.userId,
        date: startOfLocalDay(timer.startedAt),
        minutes,
        startedAt: timer.startedAt,
        endedAt,
        billable: task?.billable ?? true,
        note: timer.note,
      },
    }),
    prisma.taskTimer.delete({ where: { id: timer.id } }),
  ]);

  return minutes;
}

/** Midnight of the day a timestamp falls on — `TimeEntry.date` is a plain date. */
function startOfLocalDay(value: Date) {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}

/** Stops whatever the given user is timing, saving it. Safe when nothing runs. */
async function stopRunningTimer(userId: string) {
  const timer = await prisma.taskTimer.findUnique({ where: { userId } });
  if (!timer) return null;
  const minutes = await commitTimer(timer);
  return { timer, minutes };
}

/** Stops every timer running on one task — used when it is archived or deleted. */
async function stopTimersOnTask(taskId: string) {
  const timers = await prisma.taskTimer.findMany({ where: { taskId } });
  for (const timer of timers) await commitTimer(timer);
}

/**
 * Start timing a task.
 *
 * Any timer the caller already had running is stopped and saved first — the
 * one-timer-per-user rule, which the unique index on `TaskTimer.userId` makes
 * unavoidable rather than merely intended.
 */
export async function startTimerAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const task = await findTask(parsed.data.taskId, user.workspaceId);
  if (!task) return { ok: false, error: "That task no longer exists." };

  const previous = await stopRunningTimer(user.id);

  await prisma.taskTimer.create({
    data: { userId: user.id, taskId: task.id, note: parsed.data.note },
  });

  await recordActivity(user, "started a timer on", task.title);
  if (previous) refreshTask(task.projectId, previous.timer.taskId);
  refreshTask(task.projectId, task.id);
  return { ok: true };
}

/**
 * Stop the caller's timer and record the time.
 *
 * A run under a minute is discarded — see `MIN_TRACKED_SECONDS` — and says so,
 * rather than failing silently or writing an entry of no duration.
 */
export async function stopTimerAction(): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const timer = await prisma.taskTimer.findUnique({
    where: { userId: user.id },
    include: { task: { select: { title: true, projectId: true } } },
  });
  if (!timer) return { ok: false, error: "No timer is running." };

  const minutes = await commitTimer(timer);
  refreshTask(timer.task.projectId, timer.taskId);

  if (minutes === 0) {
    return { ok: true, error: "Under a minute — nothing was logged." };
  }

  await recordActivity(user, `logged ${formatMinutes(minutes)} on`, timer.task.title);
  return { ok: true };
}

/** Throw the running timer away without recording anything. */
export async function discardTimerAction(): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const timer = await prisma.taskTimer.findUnique({
    where: { userId: user.id },
    include: { task: { select: { projectId: true } } },
  });
  if (!timer) return { ok: false, error: "No timer is running." };

  await prisma.taskTimer.delete({ where: { id: timer.id } });
  refreshTask(timer.task.projectId, timer.taskId);
  return { ok: true };
}

// --- Time entries ----------------------------------------------------------

/**
 * Resolves the two ways of describing an entry into what the row needs.
 *
 * A start and an end give both the duration and the day. A bare duration gives
 * neither timestamp, so the day comes from the supplied date — falling back to
 * today, since an entry has to belong to some day.
 */
function resolveEntry(data: {
  durationMinutes?: number;
  date: string | null;
  startedAt?: string;
  endedAt?: string;
}) {
  if (data.startedAt && data.endedAt) {
    const startedAt = new Date(data.startedAt);
    const endedAt = new Date(data.endedAt);
    return {
      minutes: Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000),
      date: startOfLocalDay(startedAt),
      startedAt,
      endedAt,
    };
  }

  return {
    minutes: data.durationMinutes!,
    date: isoToDate(data.date) ?? startOfLocalDay(new Date()),
    startedAt: null,
    endedAt: null,
  };
}

/** Add time to a task by hand, without having timed it. */
export async function addTimeEntryAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const parsed = manualTimeEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const task = await findTask(data.taskId, user.workspaceId);
  if (!task) return { ok: false, error: "That task no longer exists." };

  const resolved = resolveEntry(data);

  await prisma.timeEntry.create({
    data: {
      taskId: task.id,
      userId: user.id,
      date: resolved.date,
      minutes: resolved.minutes,
      startedAt: resolved.startedAt,
      endedAt: resolved.endedAt,
      billable: task.billable,
      note: data.note,
    },
  });

  await recordActivity(user, `logged ${formatMinutes(resolved.minutes)} on`, task.title);
  refreshTask(task.projectId, task.id);
  return { ok: true };
}

/**
 * Whether the caller may change this entry.
 *
 * Your own is always yours to correct. Someone else's takes `time.manage`,
 * because editing it changes what the reports — and any invoice drawn from
 * them — say about their work.
 */
async function entryYouCanEdit(entryId: string, user: { id: string; workspaceId: string }) {
  const entry = await prisma.timeEntry.findFirst({
    where: { id: entryId, task: { project: { workspaceId: user.workspaceId } } },
    include: { task: { select: { id: true, projectId: true } } },
  });
  if (!entry) return { entry: null, allowed: false };

  // `viewerCan` rather than a role comparison, so a custom role that was not
  // granted `time.manage` does not inherit it from the role it extends.
  const allowed = entry.userId === user.id || (await viewerCan("time.manage"));
  return { entry, allowed };
}

export async function updateTimeEntryAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const parsed = updateTimeEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const { entry, allowed } = await entryYouCanEdit(data.entryId, user);
  if (!entry) return NOT_FOUND;
  if (!allowed) return { ok: false, error: "You can only edit your own time entries." };

  const resolved = resolveEntry(data);

  await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      date: resolved.date,
      minutes: resolved.minutes,
      startedAt: resolved.startedAt,
      endedAt: resolved.endedAt,
      note: data.note,
    },
  });

  refreshTask(entry.task.projectId, entry.task.id);
  return { ok: true };
}

export async function deleteTimeEntryAction(entryId: string): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const { entry, allowed } = await entryYouCanEdit(entryId, user);
  if (!entry) return NOT_FOUND;
  if (!allowed) return { ok: false, error: "You can only delete your own time entries." };

  await prisma.timeEntry.delete({ where: { id: entry.id } });

  refreshTask(entry.task.projectId, entry.task.id);
  return { ok: true };
}


// --- Attachments -----------------------------------------------------------

/** One file's outcome, so a partial batch can report exactly what failed. */
export type UploadOutcome = { filename: string; ok: boolean; error?: string };
export type UploadResult = { ok: boolean; error?: string; results: UploadOutcome[] };

/**
 * Upload the images chosen for a task, when the form is saved.
 *
 * Files arrive as `FormData` and the bytes travel through this server, which is
 * what lets `uploadImageToR2` resize and re-encode each one before storing it —
 * a phone photo lands as a few hundred KB rather than nine megabytes.
 *
 * Each file is reported separately: one bad image in a selection of five should
 * not discard the four that worked, so the batch continues and the caller is
 * told which failed.
 */
export async function uploadTaskImagesAction(formData: FormData): Promise<UploadResult> {
  const user = await requirePermission("tasks.manage");

  if (!isR2Configured()) {
    return { ok: false, error: "Image uploads are not configured on this server.", results: [] };
  }

  const taskId = String(formData.get("taskId") ?? "");
  const task = await findTask(taskId, user.workspaceId);
  if (!task) return { ok: false, error: "That task no longer exists.", results: [] };

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) return { ok: false, error: "No image was selected.", results: [] };

  const results: UploadOutcome[] = [];

  for (const file of files) {
    // Re-checked here rather than trusted from the browser: this action is
    // reachable directly, not only through the uploader that already checked.
    const allowed = validateImageFile(file);
    if (!allowed.isValid) {
      results.push({ filename: file.name, ok: false, error: allowed.error });
      continue;
    }

    const upload = await uploadImageToR2(file, "task-attachment");
    if (!upload.success || !upload.objectKey) {
      results.push({ filename: file.name, ok: false, error: upload.error ?? "Upload failed." });
      continue;
    }

    await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        objectKey: upload.objectKey,
        filename: file.name,
        mimeType: upload.format ? `image/${upload.format}` : file.type,
        size: upload.bytes ?? file.size,
        width: upload.width ?? null,
        height: upload.height ?? null,
        uploadedById: user.id,
      },
    });

    results.push({ filename: file.name, ok: true });
  }

  const saved = results.filter((result) => result.ok).length;
  if (saved) {
    await recordActivity(
      user,
      saved === 1 ? "attached an image to" : `attached ${saved} images to`,
      task.title,
    );
    refreshTask(task.projectId, task.id);
  }

  return { ok: saved > 0, results };
}

/**
 * Remove an attachment from the task and from R2.
 *
 * R2 goes first: if that fails the row stays and the image is still reachable
 * through the UI that can retry. Deleting the row first would leave a stored
 * object nothing in the app can ever point at again.
 */
export async function deleteAttachmentAction(id: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const attachment = await prisma.taskAttachment.findFirst({
    where: { id, task: { project: { workspaceId: user.workspaceId } } },
    include: { task: { select: { id: true, projectId: true } } },
  });
  if (!attachment) return NOT_FOUND;

  const removed = await deleteFromR2(attachment.objectKey);
  if (!removed) return { ok: false, error: "Could not delete that image from storage." };

  await prisma.taskAttachment.delete({ where: { id: attachment.id } });

  refreshTask(attachment.task.projectId, attachment.task.id);
  return { ok: true };
}
