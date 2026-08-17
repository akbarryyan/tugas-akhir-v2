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

  // Wajib di-cache pada semua environment. Tanpa ini, setiap akses properti
  // pada proxy di bawah akan membuat PrismaClient baru beserta connection pool
  // sendiri, sehingga satu halaman yang menjalankan beberapa query paralel
  // dapat menghabiskan kuota koneksi database ("Too many connections").
  globalForPrisma.prisma = nextPrisma;

  return nextPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaInstance() as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
