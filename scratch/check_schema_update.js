const { PrismaClient } = require("./generated/prisma");
const prisma = new PrismaClient();

async function main() {
  try {
    const workspace = await prisma.workspace.findFirst();
    console.log("Workspace structure:", Object.keys(workspace || {}));
    if (workspace && 'description' in workspace) {
      console.log("SUCCESS: description field exists in Prisma client.");
    } else if (workspace) {
      console.log("FAILURE: description field NOT found in workspace object.");
    } else {
      console.log("No workspaces found to check.");
    }
  } catch (e) {
    console.error("Error checking workspace:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
