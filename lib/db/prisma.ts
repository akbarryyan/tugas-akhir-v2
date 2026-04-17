import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { getMariadbConfigFromUrl } from "@/lib/db/mariadb-config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Configure it before using Prisma.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaMariaDb(getMariadbConfigFromUrl(databaseUrl));

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaInstance() {
  const cachedPrisma = globalForPrisma.prisma as
    | (PrismaClient & {
        bankSoal?: unknown;
      })
    | undefined;

  if (cachedPrisma && typeof cachedPrisma.bankSoal !== "undefined") {
    return cachedPrisma;
  }

  const nextPrisma = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = nextPrisma;
  }

  return nextPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaInstance() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
