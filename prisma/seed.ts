import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import type { Prisma } from "../src/lib/generated/prisma/client";
import * as data from "./seed-data";
import { buildDatabaseUrl } from "../src/lib/db-config/db-config";

function isoDate(value: string | null | undefined) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  // The same resolver the app and the Prisma CLI use, so the seed always lands
  // in the database the rest of the project is pointed at: discrete DB_* vars
  // first, DATABASE_URL only as a fallback. Reading DATABASE_URL directly meant
  // the seed broke the moment .env moved over to DB_HOST/DB_NAME/...
  const connectionString = buildDatabaseUrl();

  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Set SEED_PASSWORD (8+ characters) before seeding.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(connectionString),
  });

  const passwordHash = await bcrypt.hash(password, 12);

  // 1. Workspaces.
  const workspaceIdBySlug = new Map<string, string>();
  for (const workspace of data.workspaces) {
    const row = await prisma.workspace.upsert({
      where: { slug: workspace.slug },
      update: { name: workspace.name, description: workspace.description },
      create: {
        slug: workspace.slug,
        name: workspace.name,
        description: workspace.description,
      },
    });
    workspaceIdBySlug.set(workspace.slug, row.id);
  }
  const workspaceId = (slug: string) => {
    const id = workspaceIdBySlug.get(slug);
    if (!id) throw new Error(`Seed references unknown workspace ${slug}`);
    return id;
  };

  // 2. Teams (without leads — the users they point at do not exist yet).
  const teamIdBySlug = new Map<string, string>();
  for (const team of data.teams) {
    const row = await prisma.team.upsert({
      where: { workspaceId_slug: { workspaceId: workspaceId(team.workspaceSlug), slug: team.slug } },
      update: { name: team.name, code: team.code, description: team.description, color: team.color },
      create: {
        workspaceId: workspaceId(team.workspaceSlug),
        slug: team.slug,
        name: team.name,
        code: team.code,
        description: team.description,
        color: team.color,
      },
    });
    teamIdBySlug.set(team.slug, row.id);
  }

  // 3. Users and their per-workspace memberships.
  const userIdByEmail = new Map<string, string>();
  for (const user of data.users) {
    const firstWorkspace = workspaceId(user.memberships[0].workspaceSlug);
    const shared = {
      name: user.name,
      teamId: teamIdBySlug.get(user.teamSlug) ?? null,
      designation: user.designation,
      hourlyRate: user.hourlyRate,
      monthlyHours: user.monthlyHours,
    };
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: shared,
      create: { ...shared, email: user.email, passwordHash, lastWorkspaceId: firstWorkspace },
    });
    userIdByEmail.set(user.email, row.id);

    for (const membership of user.memberships) {
      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: { workspaceId: workspaceId(membership.workspaceSlug), userId: row.id },
        },
        update: { role: membership.role as Prisma.WorkspaceMemberCreateInput["role"] },
        create: {
          workspaceId: workspaceId(membership.workspaceSlug),
          userId: row.id,
          role: membership.role as Prisma.WorkspaceMemberCreateInput["role"],
        },
      });
    }
  }
  const userId = (email: string) => {
    const id = userIdByEmail.get(email);
    if (!id) throw new Error(`Seed references unknown user ${email}`);
    return id;
  };

  // 4. Team leads, now that users exist.
  for (const team of data.teams) {
    await prisma.team.update({
      where: { id: teamIdBySlug.get(team.slug) },
      data: { leadId: userId(team.leadEmail) },
    });
  }

  // 5. Projects and their membership.
  const projectIdByKey = new Map<string, string>();
  for (const project of data.projects) {
    const shared = {
      workspaceId: workspaceId(project.workspaceSlug),
      description: project.description,
      status: project.status as Prisma.ProjectCreateInput["status"],
      color: project.color,
      teamId: teamIdBySlug.get(project.team) ?? null,
      startDate: isoDate(project.startDate),
      endDate: isoDate(project.endDate),
    };
    const existing = await prisma.project.findFirst({ where: { name: project.name } });
    const row = existing
      ? await prisma.project.update({ where: { id: existing.id }, data: shared })
      : await prisma.project.create({ data: { ...shared, name: project.name } });

    projectIdByKey.set(project.key, row.id);

    await prisma.projectMember.deleteMany({ where: { projectId: row.id } });
    await prisma.projectMember.createMany({
      data: project.memberEmails.map((email) => ({ projectId: row.id, userId: userId(email) })),
    });
  }
  const projectId = (key: string) => {
    const id = projectIdByKey.get(key);
    if (!id) throw new Error(`Seed references unknown project ${key}`);
    return id;
  };

  // 6. Tasks and assignees.
  const taskIdByKey = new Map<string, string>();
  for (const [index, task] of data.tasks.entries()) {
    const shared = {
      projectId: projectId(task.project),
      status: task.status as Prisma.TaskCreateInput["status"],
      priority: task.priority as Prisma.TaskCreateInput["priority"],
      estimateMinutes: task.estimateMinutes,
      billable: task.billable,
      dueDate: isoDate("dueDate" in task ? task.dueDate : null),
      subtasksTotal: "subtasksTotal" in task ? task.subtasksTotal : 0,
      subtasksDone: "subtasksDone" in task ? task.subtasksDone : 0,
      position: index,
    };
    const existing = await prisma.task.findFirst({
      where: { title: task.title, projectId: shared.projectId },
    });
    const row = existing
      ? await prisma.task.update({ where: { id: existing.id }, data: shared })
      : await prisma.task.create({ data: { ...shared, title: task.title } });

    taskIdByKey.set(task.key, row.id);

    await prisma.taskAssignee.deleteMany({ where: { taskId: row.id } });
    await prisma.taskAssignee.createMany({
      data: task.assignees.map((email) => ({ taskId: row.id, userId: userId(email) })),
    });
  }
  const taskId = (key: string) => {
    const id = taskIdByKey.get(key);
    if (!id) throw new Error(`Seed references unknown task ${key}`);
    return id;
  };

  // 7. Child records. These have no natural key, so replace them wholesale.
  await prisma.timeEntry.deleteMany({});
  await prisma.timeEntry.createMany({
    data: data.timeEntries.map((entry) => ({
      date: isoDate(entry.date)!,
      userId: userId(entry.email),
      taskId: taskId(entry.task),
      minutes: entry.minutes,
      billable: entry.billable,
      note: entry.note,
    })),
  });

  await prisma.campaign.deleteMany({});
  await prisma.campaign.createMany({
    data: data.campaigns.map((campaign) => ({
      projectId: projectId(campaign.project),
      name: campaign.name,
      description: campaign.description,
      status: campaign.status as Prisma.CampaignCreateManyInput["status"],
      progress: campaign.progress,
      startDate: isoDate(campaign.startDate),
      endDate: isoDate(campaign.endDate),
      budget: campaign.budget,
    })),
  });

  await prisma.landingSection.deleteMany({});
  await prisma.landingSection.createMany({
    data: data.projects.flatMap((project) =>
      data.landingSections.map((section, position) => ({
        projectId: projectId(project.key),
        type: section.type as Prisma.LandingSectionCreateManyInput["type"],
        heading: section.heading,
        subheading: section.subheading,
        items: section.items ? [...section.items] : undefined,
        primaryCta: section.primaryCta,
        secondaryCta: section.secondaryCta,
        position,
      })),
    ),
  });

  await prisma.activityEntry.deleteMany({});
  await prisma.activityEntry.createMany({
    data: data.activity.map((entry) => ({
      workspaceId: workspaceId(entry.workspaceSlug),
      userId: userId(entry.email),
      action: entry.action,
      target: entry.target,
      at: new Date(entry.at),
    })),
  });

  await prisma.message.deleteMany({});
  await prisma.message.createMany({
    data: data.messages.map((message) => ({
      workspaceId: workspaceId(message.workspaceSlug),
      senderId: userId(message.from),
      recipientId: userId(message.to),
      body: message.body,
      sentAt: new Date(message.at),
    })),
  });

  const counts = {
    workspaces: await prisma.workspace.count(),
    teams: await prisma.team.count(),
    users: await prisma.user.count(),
    memberships: await prisma.workspaceMember.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    timeEntries: await prisma.timeEntry.count(),
    campaigns: await prisma.campaign.count(),
    sections: await prisma.landingSection.count(),
    activity: await prisma.activityEntry.count(),
    messages: await prisma.message.count(),
  };
  console.table(counts);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
