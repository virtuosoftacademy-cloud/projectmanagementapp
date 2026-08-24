"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hoursToMinutes } from "@/lib/domain";
import {
  campaignStatusToDb,
  isoToDate,
  priorityToDb,
  projectStatusToDb,
  sectionTypeToDb,
  taskStatusToDb,
} from "@/lib/mappers";
import { requirePermission } from "@/lib/session";
import {
  addProjectMembersSchema,
  addSectionSchema,
  campaignSchema,
  createProjectSchema,
  createTaskSchema,
  firstError,
  logTimeSchema,
  moveTaskSchema,
  projectFeaturesSchema,
  sendMessageSchema,
  updateProjectSchema,
  updateSectionSchema,
} from "@/lib/validations";
import type {
  CampaignStatus,
  Priority,
  ProjectStatus,
  SectionType,
  TaskStatus,
} from "@/lib/domain";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Writes for the project domain. Every action re-checks the caller's permission
 * server-side — the UI hides controls the role cannot use, but that is a
 * convenience, never the enforcement — and every action that touches an
 * existing record confirms it belongs to the caller's workspace before
 * mutating it, since a record id alone is never proof of ownership.
 */

const NOT_FOUND: ActionResult = { ok: false, error: "That record no longer exists." };

function refreshProject(projectId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/projects/tasks");
  revalidatePath("/projects/calendar");
  revalidatePath("/projects/analytics");
  revalidatePath("/projects/time-tracking");
  if (projectId) revalidatePath(`/projects/project/${projectId}`, "layout");
}

// --- Projects --------------------------------------------------------------

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.create");

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  await prisma.project.create({
    data: {
      workspaceId: user.workspaceId,
      name: data.name,
      description: data.description,
      status: projectStatusToDb[data.status as ProjectStatus],
      color: data.color,
      teamId: data.teamId || null,
      startDate: isoToDate(data.startDate),
      endDate: isoToDate(data.endDate),
      members: { create: data.memberIds.map((userId) => ({ userId })) },
    },
  });

  refreshProject();
  return { ok: true };
}

export async function updateProjectAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.project.findFirst({
    where: { id: data.id, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!existing) return NOT_FOUND;

  await prisma.project.update({
    where: { id: data.id },
    data: {
      name: data.name,
      description: data.description,
      status: projectStatusToDb[data.status as ProjectStatus],
      teamId: data.teamId || null,
      startDate: isoToDate(data.startDate),
      endDate: isoToDate(data.endDate),
      defaultBillable: data.defaultBillable,
    },
  });

  refreshProject(data.id);
  revalidatePath("/projects/settings");
  return { ok: true };
}

export async function addProjectMembersAction(
  projectId: string,
  userIds: string[],
): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = addProjectMembersSchema.safeParse({ projectId, userIds });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!project) return NOT_FOUND;

  await prisma.projectMember.createMany({
    data: parsed.data.userIds.map((userId) => ({ projectId: parsed.data.projectId, userId })),
    skipDuplicates: true,
  });

  refreshProject(projectId);
  return { ok: true };
}

/** Switch a project's optional sub-pages on or off. */
export async function updateProjectFeaturesAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = projectFeaturesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.project.findFirst({
    where: { id: data.projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!existing) return NOT_FOUND;

  await prisma.project.update({
    where: { id: data.projectId },
    data: { features: data.features },
  });

  refreshProject(data.projectId);
  return { ok: true };
}

// --- Tasks -----------------------------------------------------------------

export async function createTaskAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: data.projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!project) return NOT_FOUND;

  const last = await prisma.task.findFirst({
    where: { projectId: data.projectId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      status: taskStatusToDb[data.status as TaskStatus],
      priority: priorityToDb[data.priority as Priority],
      estimateMinutes: hoursToMinutes(data.estimateHours),
      billable: data.billable,
      dueDate: isoToDate(data.dueDate),
      position: (last?.position ?? -1) + 1,
      assignees: { create: data.assigneeIds.map((userId) => ({ userId })) },
    },
  });

  refreshProject(data.projectId);
  return { ok: true };
}

export async function moveTaskAction(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const parsed = moveTaskSchema.safeParse({ taskId, status });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const task = await prisma.task.findFirst({
    where: { id: parsed.data.taskId, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!task) return NOT_FOUND;

  await prisma.task.update({
    where: { id: parsed.data.taskId },
    data: { status: taskStatusToDb[parsed.data.status as TaskStatus] },
  });

  refreshProject(task.projectId);
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.manage");

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!task) return NOT_FOUND;

  await prisma.task.delete({ where: { id: taskId } });

  refreshProject(task.projectId);
  return { ok: true };
}

// --- Time entries ----------------------------------------------------------

export async function logTimeAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("time.log");

  const parsed = logTimeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: data.taskId, project: { workspaceId: user.workspaceId } },
    select: { billable: true, projectId: true },
  });
  if (!task) return { ok: false, error: "That task no longer exists." };

  await prisma.timeEntry.create({
    data: {
      taskId: data.taskId,
      userId: user.id,
      date: isoToDate(data.date) ?? new Date(),
      minutes: data.minutes,
      billable: task.billable,
      note: data.note,
    },
  });

  refreshProject(task.projectId);
  return { ok: true };
}

// --- Campaigns -------------------------------------------------------------

export async function createCampaignAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!project) return NOT_FOUND;

  await prisma.campaign.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      status: campaignStatusToDb[data.status as CampaignStatus],
      progress: data.progress,
      startDate: isoToDate(data.startDate),
      endDate: isoToDate(data.endDate),
      budget: data.budget,
    },
  });

  revalidatePath(`/projects/project/${projectId}/campaigns`);
  return { ok: true };
}

export async function updateCampaignAction(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.campaign.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!existing) return NOT_FOUND;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      status: campaignStatusToDb[data.status as CampaignStatus],
      progress: data.progress,
      startDate: isoToDate(data.startDate),
      endDate: isoToDate(data.endDate),
      budget: data.budget,
    },
    select: { projectId: true },
  });

  revalidatePath(`/projects/project/${campaign.projectId}/campaigns`);
  return { ok: true };
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  const user = await requirePermission("projects.delete");

  const existing = await prisma.campaign.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!existing) return NOT_FOUND;

  const campaign = await prisma.campaign.delete({ where: { id }, select: { projectId: true } });
  revalidatePath(`/projects/project/${campaign.projectId}/campaigns`);
  return { ok: true };
}

// --- Landing sections ------------------------------------------------------

export async function addSectionAction(
  projectId: string,
  type: SectionType,
  defaults: { heading: string; subheading?: string; items?: string[]; primaryCta?: string; secondaryCta?: string },
): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = addSectionSchema.safeParse({ projectId, type });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!project) return NOT_FOUND;

  const last = await prisma.landingSection.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.landingSection.create({
    data: {
      projectId,
      type: sectionTypeToDb[type],
      heading: defaults.heading,
      subheading: defaults.subheading ?? null,
      items: defaults.items ?? undefined,
      primaryCta: defaults.primaryCta ?? null,
      secondaryCta: defaults.secondaryCta ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/project/${projectId}/landing-pages`);
  return { ok: true };
}

export async function updateSectionAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const parsed = updateSectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const data = parsed.data;

  const existing = await prisma.landingSection.findFirst({
    where: { id: data.id, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!existing) return NOT_FOUND;

  const section = await prisma.landingSection.update({
    where: { id: data.id },
    data: {
      heading: data.heading,
      subheading: data.subheading,
      items: data.items ?? undefined,
      primaryCta: data.primaryCta,
      secondaryCta: data.secondaryCta,
    },
    select: { projectId: true },
  });

  revalidatePath(`/projects/project/${section.projectId}/landing-pages`);
  return { ok: true };
}

export async function deleteSectionAction(id: string): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const existing = await prisma.landingSection.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!existing) return NOT_FOUND;

  const section = await prisma.landingSection.delete({
    where: { id },
    select: { projectId: true },
  });

  revalidatePath(`/projects/project/${section.projectId}/landing-pages`);
  return { ok: true };
}

/** Swap a section with its neighbour. */
export async function moveSectionAction(id: string, delta: -1 | 1): Promise<ActionResult> {
  const user = await requirePermission("projects.edit");

  const section = await prisma.landingSection.findFirst({
    where: { id, project: { workspaceId: user.workspaceId } },
  });
  if (!section) return { ok: false, error: "That section no longer exists." };

  const neighbour = await prisma.landingSection.findFirst({
    where: {
      projectId: section.projectId,
      position: delta === -1 ? { lt: section.position } : { gt: section.position },
    },
    orderBy: { position: delta === -1 ? "desc" : "asc" },
  });
  if (!neighbour) return { ok: true };

  await prisma.$transaction([
    prisma.landingSection.update({
      where: { id: section.id },
      data: { position: neighbour.position },
    }),
    prisma.landingSection.update({
      where: { id: neighbour.id },
      data: { position: section.position },
    }),
  ]);

  revalidatePath(`/projects/project/${section.projectId}/landing-pages`);
  return { ok: true };
}

// --- Messages --------------------------------------------------------------

export async function sendMessageAction(
  recipientId: string,
  body: string,
): Promise<ActionResult> {
  const user = await requirePermission("projects.view");

  const parsed = sendMessageSchema.safeParse({ recipientId, body });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const recipient = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: user.workspaceId, userId: parsed.data.recipientId },
    },
    select: { userId: true },
  });
  if (!recipient) return { ok: false, error: "That person isn't in this workspace." };

  await prisma.message.create({
    data: {
      workspaceId: user.workspaceId,
      senderId: user.id,
      recipientId: parsed.data.recipientId,
      body: parsed.data.body,
    },
  });

  revalidatePath("/messages");
  return { ok: true };
}
