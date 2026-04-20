import { hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";

async function main() {
  console.log("Seeding Database...");

  // 1. Clean up existing data to avoid "Unique constraint" errors
  await prisma.project.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  // 2. Create Teams
  const teams = await Promise.all([
    prisma.team.create({
      data: { name: "Engineering", description: "Software Development", code: "ENG-2026" },
    }),
    prisma.team.create({
      data: { name: "Marketing", description: "Marketing and Sales", code: "MKT-2026" },
    }),
    prisma.team.create({
      data: { name: "Operations", description: "Operations and Support", code: "OPS-2026" },
    }),
  ]);

  console.log(`Created ${teams.length} teams.`);

  // 3. Create Users
  const sampleUsers = [
    { name: "Alice Johnson", email: "alice@company.com", teamId: teams[0].id, role: Role.MANAGER },
    { name: "Bob Smith", email: "bob@company.com", teamId: teams[0].id, role: Role.USER },
    { name: "Charlie Brown", email: "charlie@company.com", teamId: teams[1].id, role: Role.MANAGER },
  ];

  const createdUsers = [];
  for (const user of sampleUsers) {
    const newUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: await hashPassword("123456"),
        role: user.role,
        teamId: user.teamId,
      },
    });
    createdUsers.push(newUser);
  }

  // 4. Create Sample Projects for Alice
  const alice = createdUsers.find((u) => u.email === "alice@company.com");

  if (alice) {
    await prisma.project.createMany({
      data: [
        {
          name: "Next.js Dashboard Redesign",
          description: "Full overhaul of the project management UI using Tailwind CSS and Framer Motion.",
          userId: alice.id,
        },
        {
          name: "PostgreSQL Optimization",
          description: "Improving query performance and indexing for the main production database.",
          userId: alice.id,
        },
      ],
    });
    console.log("Created sample projects for Alice.");
  }

  console.log(`Database seeded successfully!`);
}

main()
  .catch(async (e) => {
    console.error(`Seeding Failed: ${e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });