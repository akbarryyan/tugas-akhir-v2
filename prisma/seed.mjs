import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { URL } from "node:url";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { AuthMethod, PrismaClient, Role } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Seed cannot run without a database.");
}

function getMariadbConfigFromUrl(url) {
  const parsedUrl = new URL(url);
  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!parsedUrl.hostname || !database) {
    throw new Error("DATABASE_URL is not a valid MySQL connection string.");
  }

  return {
    allowPublicKeyRetrieval: true,
    database,
    host: parsedUrl.hostname,
    password: decodeURIComponent(parsedUrl.password),
    port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
    user: decodeURIComponent(parsedUrl.username),
  };
}

const adapter = new PrismaMariaDb(getMariadbConfigFromUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

async function seedAdmin() {
  const passwordHash = hashPassword("Admin123!");

  await prisma.user.upsert({
    where: {
      email: "admin@sekolah.sch.id",
    },
    create: {
      authMethod: AuthMethod.EMAIL_PASSWORD,
      email: "admin@sekolah.sch.id",
      name: "Administrator Sekolah",
      passwordHash,
      role: Role.ADMIN,
    },
    update: {
      authMethod: AuthMethod.EMAIL_PASSWORD,
      name: "Administrator Sekolah",
      passwordHash,
      role: Role.ADMIN,
    },
  });
}

async function seedTeacher() {
  const passwordHash = hashPassword("Guru123!");

  const teacherUser = await prisma.user.upsert({
    where: {
      email: "guru@sekolah.sch.id",
    },
    create: {
      authMethod: AuthMethod.EMAIL_PASSWORD,
      email: "guru@sekolah.sch.id",
      name: "Budi Santoso",
      passwordHash,
      role: Role.GURU,
    },
    update: {
      authMethod: AuthMethod.EMAIL_PASSWORD,
      name: "Budi Santoso",
      passwordHash,
      role: Role.GURU,
    },
  });

  await prisma.teacherProfile.upsert({
    where: {
      nip: "198812312024011001",
    },
    create: {
      nip: "198812312024011001",
      userId: teacherUser.id,
    },
    update: {
      userId: teacherUser.id,
    },
  });
}

async function seedStudent() {
  const existingStudent = await prisma.studentProfile.findUnique({
    where: {
      nisn: "1234567890",
    },
    include: {
      user: true,
    },
  });

  if (existingStudent) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: existingStudent.userId,
        },
        data: {
          authMethod: AuthMethod.NISN,
          name: "Aulia Rahma",
          role: Role.SISWA,
        },
      });

      await tx.studentProfile.update({
        where: {
          id: existingStudent.id,
        },
        data: {
          className: "XII IPA 1",
        },
      });
    });

    return;
  }

  const studentUser = await prisma.user.create({
    data: {
      authMethod: AuthMethod.NISN,
      name: "Aulia Rahma",
      role: Role.SISWA,
    },
  });

  await prisma.studentProfile.create({
    data: {
      className: "XII IPA 1",
      nisn: "1234567890",
      userId: studentUser.id,
    },
  });
}

async function main() {
  await seedAdmin();
  await seedTeacher();
  await seedStudent();

  console.log("Seed selesai dibuat.");
  console.log("Admin  : admin@sekolah.sch.id / Admin123!");
  console.log("Guru   : guru@sekolah.sch.id / Guru123!");
  console.log("Siswa  : NISN 1234567890");
}

main()
  .catch((error) => {
    console.error("Seed gagal dijalankan.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
