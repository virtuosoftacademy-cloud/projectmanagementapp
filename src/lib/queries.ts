import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  TASK_STATUSES,
  TODAY,
  formatDay,
  minutesToHours,
  percent,
  round1,
  type ActivityEntry,
  type Campaign,
  type LandingSection,
  type Member,
  type Message,
  type Person,
  type Project,
  type Task,
  type TaskStatus,
  type Team,
  type TimeEntry,
  type Workspace,
  type WorkspaceSummary,
} from "@/lib/domain";
import {
  campaignStatusToDomain,
  dateToIso,
  priorityToDomain,
  projectStatusToDomain,
  roleToDomain,
  sectionTypeToDomain,
  taskStatusToDomain,
} from "@/lib/mappers";

/**
 * Read side of the data layer. Every function is `cache()`d, so a page that
 * needs projects in three places issues one query per request.
 *
 * Callers must already be authenticated — pages call `requireUser()` from
 * `lib/session.ts` first — and pass that session's `workspaceId` into every
 * function here. A foreign id (a project from another workspace, say) just
 * comes back empty rather than leaking data, because every function starts
 * from a workspace-scoped base query.
 */

const personSelect = { id: true, name: true, email: true } as const;

// --- Workspaces --------------------------------------------------------------

/** The workspaces `userId` belongs to, with their role in each — for the switcher. */
export const getUserWorkspaces = cache(async (userId: string): Promise<WorkspaceSummary[]> => {
  const rows = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: { workspace: true },
  });

  return rows.map((row) => ({
    id: row.workspace.id,
    name: row.workspace.name,
    slug: row.workspace.slug,
    role: roleToDomain[row.role],
  }));
});

export const getWorkspace = cache(async (id: string): Promise<Workspace | null> => {
  const workspace = await prisma.workspace.findUnique({ where: { id } });
  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
  };
});

// --- People ------------------------------------------------------------------

export const getMembers = cache(async (workspaceId: string): Promise<Member[]> => {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    include: { user: true },
  });

  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: roleToDomain[row.role],
    teamId: row.user.teamId,
    designation: row.user.designation,
    hourlyRate: row.user.hourlyRate,
    monthlyHours: row.user.monthlyHours,
    disabled: row.user.disabledAt !== null,
  }));
});

export const getMember = cache(async (workspaceId: string, id: string) => {
  const members = await getMembers(workspaceId);
  return members.find((member) => member.id === id) ?? null;
});

export const getTeams = cache(async (workspaceId: string): Promise<Team[]> => {
  const teams = await prisma.team.findMany({ where: { workspaceId }, orderBy: { name: "asc" } });
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    code: team.code,
    description: team.description,
    color: team.color,
    leadId: team.leadId,
  }));
});

// --- Projects and tasks ------------------------------------------------------

export const getProjects = cache(async (workspaceId: string): Promise<Project[]> => {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: { members: { include: { user: { select: personSelect } } } },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: projectStatusToDomain[project.status],
    color: project.color,
    teamId: project.teamId,
    startDate: dateToIso(project.startDate),
    endDate: dateToIso(project.endDate),
    defaultBillable: project.defaultBillable,
    members: project.members.map((link) => link.user as Person),
  }));
});

export const getProject = cache(async (workspaceId: string, id: string) => {
  const projects = await getProjects(workspaceId);
  return projects.find((project) => project.id === id) ?? null;
});

export const getTasks = cache(async (workspaceId: string): Promise<Task[]> => {
  const tasks = await prisma.task.findMany({
    where: { project: { workspaceId } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { assignees: { include: { user: { select: personSelect } } } },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    status: taskStatusToDomain[task.status],
    priority: priorityToDomain[task.priority],
    assignees: task.assignees.map((link) => link.user as Person),
    estimateHours: minutesToHours(task.estimateMinutes),
    billable: task.billable,
    dueDate: dateToIso(task.dueDate),
    subtasksTotal: task.subtasksTotal,
    subtasksDone: task.subtasksDone,
  }));
});

export const getTask = cache(async (workspaceId: string, id: string) => {
  const tasks = await getTasks(workspaceId);
  return tasks.find((task) => task.id === id) ?? null;
});

export const getTimeEntries = cache(async (workspaceId: string): Promise<TimeEntry[]> => {
  const entries = await prisma.timeEntry.findMany({
    where: { task: { project: { workspaceId } } },
    orderBy: { date: "asc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    date: dateToIso(entry.date)!,
    userId: entry.userId,
    taskId: entry.taskId,
    hours: minutesToHours(entry.minutes),
    billable: entry.billable,
    note: entry.note,
  }));
});

// --- Derived views ------------------------------------------------------------

export type EntryDetail = TimeEntry & {
  member: Member;
  task: Task;
  project: Project;
  cost: number;
  /** Estimate minus logged hours; negative means over estimate. */
  variance: number;
};

/** Time entries joined with their member, task and project, oldest first. */
export const getEntryDetails = cache(async (workspaceId: string): Promise<EntryDetail[]> => {
  const [entries, tasks, projects, members] = await Promise.all([
    getTimeEntries(workspaceId),
    getTasks(workspaceId),
    getProjects(workspaceId),
    getMembers(workspaceId),
  ]);

  return entries.flatMap((entry) => {
    const task = tasks.find((item) => item.id === entry.taskId);
    const member = members.find((item) => item.id === entry.userId);
    const project = task ? projects.find((item) => item.id === task.projectId) : undefined;
    if (!task || !member || !project) return [];

    return [
      {
        ...entry,
        member,
        task,
        project,
        cost: Math.round(entry.hours * member.hourlyRate),
        variance: task.estimateHours - entry.hours,
      },
    ];
  });
});

export const getProjectStats = cache(async (workspaceId: string, projectId: string) => {
  const [allTasks, entries, members] = await Promise.all([
    getTasks(workspaceId),
    getTimeEntries(workspaceId),
    getMembers(workspaceId),
  ]);

  const tasks = allTasks.filter((task) => task.projectId === projectId);
  const taskIds = new Set(tasks.map((task) => task.id));
  const projectEntries = entries.filter((entry) => taskIds.has(entry.taskId));
  const rate = (userId: string) => members.find((m) => m.id === userId)?.hourlyRate ?? 0;

  const done = tasks.filter((task) => task.status === "done").length;
  const hours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const billableEntries = projectEntries.filter((entry) => entry.billable);

  return {
    tasks,
    taskCount: tasks.length,
    done,
    inProgress: tasks.filter((task) => task.status === "in-progress").length,
    byStatus: TASK_STATUSES.map(({ status, label }) => {
      const count = tasks.filter((task) => task.status === status).length;
      return { status, label, count, percent: percent(count, tasks.length) };
    }),
    progress: percent(done, tasks.length),
    hours: round1(hours),
    billableHours: round1(billableEntries.reduce((sum, entry) => sum + entry.hours, 0)),
    estimateHours: round1(tasks.reduce((sum, task) => sum + task.estimateHours, 0)),
    cost: projectEntries.reduce((sum, entry) => sum + Math.round(entry.hours * rate(entry.userId)), 0),
    billableCost: billableEntries.reduce(
      (sum, entry) => sum + Math.round(entry.hours * rate(entry.userId)),
      0,
    ),
    entries: projectEntries,
  };
});

export const getMemberStats = cache(async (workspaceId: string, memberId: string) => {
  const [allTasks, entries, member] = await Promise.all([
    getTasks(workspaceId),
    getTimeEntries(workspaceId),
    getMember(workspaceId, memberId),
  ]);

  const mine = entries.filter((entry) => entry.userId === memberId);
  const assigned = allTasks.filter((task) =>
    task.assignees.some((person) => person.id === memberId),
  );
  const hours = mine.reduce((sum, entry) => sum + entry.hours, 0);
  const rate = member?.hourlyRate ?? 0;

  return {
    hours: round1(hours),
    hoursExact: hours,
    cost: mine.reduce((sum, entry) => sum + Math.round(entry.hours * rate), 0),
    tasks: assigned,
    tasksTotal: assigned.length,
    tasksDone: assigned.filter((task) => task.status === "done").length,
    projectCount: new Set(
      mine.flatMap((entry) => {
        const task = allTasks.find((item) => item.id === entry.taskId);
        return task ? [task.projectId] : [];
      }),
    ).size,
    utilization: member?.monthlyHours ? percent(hours, member.monthlyHours) : 0,
  };
});

export const getTeamStats = cache(async (workspaceId: string, teamId: string) => {
  const [members, tasks, projects] = await Promise.all([
    getMembers(workspaceId),
    getTasks(workspaceId),
    getProjects(workspaceId),
  ]);

  const teamMembers = members.filter((m) => m.teamId === teamId);
  const memberIds = teamMembers.map((m) => m.id);
  const teamTasks = tasks.filter((task) =>
    task.assignees.some((person) => memberIds.includes(person.id)),
  );
  const done = teamTasks.filter((task) => task.status === "done").length;
  const teamProjects = projects.filter((project) => project.teamId === teamId);

  return {
    memberIds,
    /** Only active accounts block deletion — disabled ones do not. */
    activeMemberCount: teamMembers.filter((member) => !member.disabled).length,
    projectCount: teamProjects.length,
    taskCount: teamTasks.length,
    done,
    progress: percent(done, teamTasks.length),
  };
});

/** Hours logged vs estimated across every task assigned to a member. */
export const getMemberVariance = cache(async (workspaceId: string, memberId: string) => {
  const [tasks, entries] = await Promise.all([getTasks(workspaceId), getTimeEntries(workspaceId)]);

  const estimate = tasks
    .filter((task) => task.assignees.some((person) => person.id === memberId))
    .reduce((sum, task) => sum + task.estimateHours, 0);
  const logged = entries
    .filter((entry) => entry.userId === memberId)
    .reduce((sum, entry) => sum + entry.hours, 0);

  return { logged, estimate, variance: estimate - logged };
});

/** Hours logged per day, oldest first. */
export const getHoursByDay = cache(async (workspaceId: string) => {
  const entries = await getTimeEntries(workspaceId);
  const byDate = new Map<string, number>();

  for (const entry of entries) {
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.hours);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, hours]) => ({ date, label: formatDay(date), hours: round1(hours) }));
});

export const getTaskDistribution = cache(async (workspaceId: string) => {
  const tasks = await getTasks(workspaceId);
  return TASK_STATUSES.map(({ status, label }) => ({
    status: status as TaskStatus,
    label,
    count: tasks.filter((task) => task.status === status).length,
  }));
});

export const getOverdueTasks = cache(async (workspaceId: string) => {
  const tasks = await getTasks(workspaceId);
  return tasks.filter(
    (task) => task.dueDate && task.dueDate < TODAY && task.status !== "done",
  );
});

export const getMetrics = cache(async (workspaceId: string) => {
  const [projects, tasks, entries, members, teams] = await Promise.all([
    getProjects(workspaceId),
    getTasks(workspaceId),
    getTimeEntries(workspaceId),
    getMembers(workspaceId),
    getTeams(workspaceId),
  ]);

  const rate = (userId: string) => members.find((m) => m.id === userId)?.hourlyRate ?? 0;
  const cost = (list: TimeEntry[]) =>
    list.reduce((sum, entry) => sum + Math.round(entry.hours * rate(entry.userId)), 0);

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const billable = entries.filter((entry) => entry.billable);
  const billableHours = billable.reduce((sum, entry) => sum + entry.hours, 0);
  const done = tasks.filter((task) => task.status === "done").length;
  const overdue = tasks.filter(
    (task) => task.dueDate && task.dueDate < TODAY && task.status !== "done",
  ).length;

  return {
    activeProjects: projects.filter((project) => project.status === "active").length,
    planningProjects: projects.filter((project) => project.status === "planning").length,
    completedProjects: projects.filter((project) => project.status === "completed").length,
    totalProjects: projects.length,
    tasksTotal: tasks.length,
    tasksDone: done,
    completionRate: percent(done, tasks.length),
    hoursTracked: round1(totalHours),
    billableHours: round1(billableHours),
    totalHoursExact: totalHours,
    billableHoursExact: billableHours,
    billablePercent: percent(billableHours, totalHours),
    billableRevenue: cost(billable),
    cost: cost(entries),
    memberCount: members.length,
    teamCount: teams.length,
    overdueCount: overdue,
  };
});

export type Metrics = Awaited<ReturnType<typeof getMetrics>>;

// --- Project children ----------------------------------------------------------

export const getCampaigns = cache(
  async (workspaceId: string, projectId: string): Promise<Campaign[]> => {
    const campaigns = await prisma.campaign.findMany({
      where: { projectId, project: { workspaceId } },
      orderBy: { createdAt: "asc" },
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      projectId: campaign.projectId,
      name: campaign.name,
      description: campaign.description,
      status: campaignStatusToDomain[campaign.status],
      progress: campaign.progress,
      startDate: dateToIso(campaign.startDate),
      endDate: dateToIso(campaign.endDate),
      budget: campaign.budget,
    }));
  },
);

export const getLandingSections = cache(
  async (workspaceId: string, projectId: string): Promise<LandingSection[]> => {
    const sections = await prisma.landingSection.findMany({
      where: { projectId, project: { workspaceId } },
      orderBy: { position: "asc" },
    });

    return sections.map((section) => ({
      id: section.id,
      projectId: section.projectId,
      type: sectionTypeToDomain[section.type],
      heading: section.heading,
      subheading: section.subheading,
      items: Array.isArray(section.items) ? (section.items as string[]) : null,
      primaryCta: section.primaryCta,
      secondaryCta: section.secondaryCta,
      position: section.position,
    }));
  },
);

// --- Activity and messages ------------------------------------------------------

export const getActivity = cache(
  async (workspaceId: string, limit = 5): Promise<ActivityEntry[]> => {
    const rows = await prisma.activityEntry.findMany({
      where: { workspaceId },
      orderBy: { at: "desc" },
      take: limit,
      include: { user: { select: personSelect } },
    });

    return rows.map((row) => ({
      id: row.id,
      actor: row.user as Person,
      action: row.action,
      target: row.target,
      at: formatTimestamp(row.at),
    }));
  },
);

/** Every message involving `userId` within this workspace, flattened into per-contact threads. */
export const getMessages = cache(
  async (workspaceId: string, userId: string): Promise<Message[]> => {
    const rows = await prisma.message.findMany({
      where: { workspaceId, OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { sentAt: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      memberId: row.senderId === userId ? row.recipientId : row.senderId,
      from: row.senderId === userId ? "me" : "them",
      text: row.body,
      date: formatDay(row.sentAt.toISOString().slice(0, 10)),
      time: formatClock(row.sentAt),
    }));
  },
);

const HOUR_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

/** `02:30 PM` — fixed to UTC so server and client agree. */
function formatClock(value: Date) {
  return HOUR_FORMAT.format(value);
}

/** `Feb 17, 02:30 PM`. */
function formatTimestamp(value: Date) {
  return `${formatDay(value.toISOString().slice(0, 10))}, ${formatClock(value)}`;
}
