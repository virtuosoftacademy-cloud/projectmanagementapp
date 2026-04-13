import { PrismaClient } from "@/generated/prisma";


export const prisma = new PrismaClient();

export async function checkConnection(): Promise<boolean> {
    try {
        await prisma.$queryRaw`Select 1`;
        return true;
    } catch (error) {
        console.error(`Error connecting to the database: ${error}`);
        return false;
    }
}