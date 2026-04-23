import { PrismaClient } from "../generated/prisma";
const prisma = new PrismaClient();

async function main() {
  const bob = await prisma.user.findUnique({
    where: { email: "bob@company.com" }
  });

  if (!bob) {
    console.log("Bob not found");
    return;
  }

  const projects = await prisma.project.findMany({
    where: { userId: bob.id },
    include: {
      workspace: true
    }
  });

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { userId: bob.id },
        { teamId: bob.teamId || "" }
      ]
    }
  });

  console.log("BOB PROJECTS:");
  console.log(JSON.stringify(projects, null, 2));
  console.log("\nWORKSPACES ACCESSIBLE BY BOB:");
  console.log(JSON.stringify(workspaces, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
