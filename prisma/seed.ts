import { hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";

async function main() {
  console.log("Seeding Database...");
  //Create Teams User
  const teams = await Promise.all([
    prisma.team.create({
      data:
      {
        name: "Engineering",
        description: "Software Development",
        code: "ENG-2026"
      },
    }),
    prisma.team.create({
      data:
      {
        name: "Marketing",
        description: "Marketing and Sales",
        code: "MKT-2026"
      },
    }),
    prisma.team.create({
      data:
      {
        name: "Operations",
        description: "Operations and Support",
        code: "OPS-2026"
      },
    }),
  ]);
  console.log(`Created ${teams.length} teams.`);
  
  //Create Users
  const sampleUsers = [
    {
      name: "Alice Johnson",
      email: "alice@company.com",
      teamId: teams[0].id,
      role: Role.MANAGER,
    },
    {
      name: "Bob Smith",
      email: "bob@company.com",
      teamId: teams[0].id,
      role: Role.USER,
    },
    {
      name: "Charlie Brown",
      email: "charlie@company.com",
      teamId: teams[1].id,
      role: Role.MANAGER,
    },
    {
      name: "David Wilson",
      email: "david@company.com",
      teamId: teams[1].id,
      role: Role.USER,
    },
    {
      name: "Eve Davis",
      email: "eve@company.com",
      teamId: teams[2].id,
      role: Role.MANAGER,
    },
    {
      name: "Frank Miller",
      email: "frank@company.com",
      teamId: teams[2].id,
      role: Role.USER,
    }
  ]
   
  for(const user of sampleUsers) {
    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: await hashPassword("123456"),
        role: user.role,
        teamId: user.teamId,
      }
    });
  }
  console.log(`Database seeded successfully!`);
}

main()
  .catch(async (e) => {
    console.error(`Seeding Failed: ${e}`);
    process.exit(1);
  }).finally(async () => {
    await prisma.$disconnect();
  });