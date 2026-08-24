import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { buildDatabaseUrl } from "./db-config/db-config";

/**
 * Prisma 7 requires a driver adapter. `@prisma/adapter-mariadb` speaks the
 * MySQL wire protocol, so it serves both MySQL and MariaDB.
 *
 * The client is cached on globalThis so `next dev`'s hot reload does not open a
 * new connection pool on every recompile.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = buildDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }

  // The adapter takes either a connection URL or a mariadb PoolConfig.
  return new PrismaClient({
    adapter: new PrismaMariaDb(connectionString),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
