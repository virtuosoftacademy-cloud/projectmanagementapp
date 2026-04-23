import { hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";

async function main() {
  console.log("Seeding Database...");

  // 1. Create or Find Teams (Using upsert to avoid deleting/duplicates)
  const engineeringTeam = await prisma.team.upsert({
    where: { name: "Engineering" },
    update: {},
    create: { name: "Engineering", description: "Software Development", code: "ENG-2026" },
  });

  const marketingTeam = await prisma.team.upsert({
    where: { name: "Marketing" },
    update: {},
    create: { name: "Marketing", description: "Marketing and Sales", code: "MKT-2026" },
  });

  // 2. Create or Find Users
  const alice = await prisma.user.upsert({
    where: { email: "alice@company.com" },
    update: { teamId: engineeringTeam.id },
    create: {
      name: "Alice Johnson",
      email: "alice@company.com",
      password: await hashPassword("123456"),
      role: Role.MANAGER,
      teamId: engineeringTeam.id,
      hourlyRate: 50,
      monthlyHours: 160,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@company.com" },
    update: { teamId: engineeringTeam.id },
    create: {
      name: "Bob Smith",
      email: "bob@company.com",
      password: await hashPassword("123456"),
      role: Role.USER,
      teamId: engineeringTeam.id,
      hourlyRate: 50,
      monthlyHours: 160,
    },
  });

  // 3. Create a SHARED Workspace for the Engineering Team (Acme Inc.)
  const engineeringWorkspace = await prisma.workspace.upsert({
    where: { id: "cl_eng_workspace" }, // Using a fixed ID for the seed workspace
    update: { name: "Acme Inc.", teamId: engineeringTeam.id },
    create: {
        id: "cl_eng_workspace",
        name: "Acme Inc.",
        userId: alice.id,
        teamId: engineeringTeam.id,
    }
  });

  // 4. Ensure Projects are linked to the Workspace
  // Alice's Projects
  const aliceProject = await prisma.project.upsert({
    where: { id: "cl_alice_p1" },
    update: { workspaceId: engineeringWorkspace.id },
    create: {
        id: "cl_alice_p1",
        name: "Alice's Main Project",
        description: "Primary workspace for Alice.",
        userId: alice.id,
        workspaceId: engineeringWorkspace.id,
        status: "ACTIVE",
    }
  });

  // Bob's Projects
  const bobProject = await prisma.project.upsert({
    where: { id: "cl_bob_p1" },
    update: { workspaceId: engineeringWorkspace.id },
    create: {
        id: "cl_bob_p1",
        name: "Bob's Research",
        description: "Bob's assigned research project.",
        userId: bob.id,
        workspaceId: engineeringWorkspace.id,
        status: "ACTIVE",
    }
  });

  // 5. Create Tasks linked to Projects
  await prisma.task.upsert({
    where: { id: "t1" },
    update: { 
      projectId: aliceProject.id, 
      status: "IN_PROGRESS",
      priority: "HIGH",
      estimatedTime: "3h 0m",
      dueDate: new Date("2026-02-25"),
      tags: ["billable"],
    },
    create: {
      id: "t1",
      title: "Set up CI/CD pipeline",
      description: "Automate testing and deployment workflows.",
      status: "IN_PROGRESS",
      userId: alice.id,
      projectId: aliceProject.id,
      priority: "HIGH",
      estimatedTime: "3h 0m",
      dueDate: new Date("2026-02-25"),
      tags: ["billable"],
    }
  });

  await prisma.task.upsert({
    where: { id: "t2" },
    update: { 
      projectId: aliceProject.id, 
      status: "TODO",
      priority: "LOW",
      estimatedTime: "1h 30m",
      tags: ["design"],
    },
    create: {
      id: "t2",
      title: "Footer component",
      description: "Implement responsive footer with social links.",
      status: "TODO",
      userId: alice.id,
      projectId: aliceProject.id,
      priority: "LOW",
      estimatedTime: "1h 30m",
      tags: ["design"],
    }
  });

  await prisma.task.upsert({
    where: { id: "t3" },
    update: { 
      projectId: bobProject.id, 
      status: "TODO",
      priority: "HIGH",
      estimatedTime: "16h 0m",
      dueDate: new Date("2026-02-28"),
      tags: ["billable"],
    },
    create: {
      id: "t3",
      title: "Develop Landing Page",
      description: "Design and code the main marketing landing page.",
      status: "TODO",
      userId: bob.id,
      projectId: bobProject.id,
      priority: "HIGH",
      estimatedTime: "16h 0m",
      dueDate: new Date("2026-02-28"),
      tags: ["billable"],
    }
  });

  console.log(`Database seeded successfully! Workspace 'Acme Inc.' is now shared and tasks are linked.`);
}

main()
  .catch(async (e) => {
    console.error(`Seeding Failed: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });