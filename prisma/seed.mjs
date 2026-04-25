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

  return prisma.teacherProfile.upsert({
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
    return prisma.$transaction(async (tx) => {
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

      return tx.studentProfile.update({
        where: {
          id: existingStudent.id,
        },
        data: {
          className: "XII IPA 1",
        },
      });
    });
  }

  const studentUser = await prisma.user.create({
    data: {
      authMethod: AuthMethod.NISN,
      name: "Aulia Rahma",
      role: Role.SISWA,
    },
  });

  return prisma.studentProfile.create({
    data: {
      className: "XII IPA 1",
      nisn: "1234567890",
      userId: studentUser.id,
    },
  });
}

async function seedTryoutFlowData({ studentProfileId, teacherProfileId }) {
  const subject = await prisma.subject.upsert({
    where: {
      name: "Agama",
    },
    create: {
      description: "Mata pelajaran untuk pengujian alur tryout siswa.",
      isActive: true,
      name: "Agama",
    },
    update: {
      description: "Mata pelajaran untuk pengujian alur tryout siswa.",
      isActive: true,
    },
  });

  await prisma.subjectTeacher.upsert({
    where: {
      subjectId_teacherId: {
        subjectId: subject.id,
        teacherId: teacherProfileId,
      },
    },
    create: {
      subjectId: subject.id,
      teacherId: teacherProfileId,
    },
    update: {},
  });

  const questionFixtures = [
    {
      correctOption: "C",
      explanation: "Rukun iman berjumlah enam.",
      optionA: "Empat",
      optionB: "Lima",
      optionC: "Enam",
      optionD: "Tujuh",
      questionText: "Berapa jumlah rukun iman?",
    },
    {
      correctOption: "B",
      explanation: "Kitab suci umat Islam adalah Al-Qur'an.",
      optionA: "Injil",
      optionB: "Al-Qur'an",
      optionC: "Taurat",
      optionD: "Zabur",
      questionText: "Kitab suci umat Islam adalah?",
    },
    {
      correctOption: "A",
      explanation: "Salat Subuh terdiri dari 2 rakaat.",
      optionA: "2 rakaat",
      optionB: "3 rakaat",
      optionC: "4 rakaat",
      optionD: "5 rakaat",
      questionText: "Jumlah rakaat salat Subuh adalah?",
    },
    {
      correctOption: "D",
      explanation: "Puasa Ramadan hukumnya wajib bagi muslim yang memenuhi syarat.",
      optionA: "Sunnah",
      optionB: "Makruh",
      optionC: "Mubah",
      optionD: "Wajib",
      questionText: "Hukum puasa Ramadan bagi muslim yang memenuhi syarat adalah?",
    },
    {
      correctOption: "B",
      explanation: "Zakat fitrah ditunaikan sebelum salat Idulfitri.",
      optionA: "Sesudah Idulfitri",
      optionB: "Sebelum salat Idulfitri",
      optionC: "Awal Ramadan saja",
      optionD: "Kapan saja tanpa batas",
      questionText: "Waktu utama membayar zakat fitrah adalah?",
    },
  ];

  const questions = [];

  for (const [index, fixture] of questionFixtures.entries()) {
    const existingQuestion = await prisma.question.findFirst({
      where: {
        createdByTeacherId: teacherProfileId,
        questionText: fixture.questionText,
        subjectId: subject.id,
      },
      select: {
        id: true,
      },
    });

    const question = existingQuestion
      ? await prisma.question.update({
          where: {
            id: existingQuestion.id,
          },
          data: {
            correctOption: fixture.correctOption,
            explanation: fixture.explanation,
            isActive: true,
            optionA: fixture.optionA,
            optionB: fixture.optionB,
            optionC: fixture.optionC,
            optionD: fixture.optionD,
            questionText: fixture.questionText,
            subjectId: subject.id,
          },
        })
      : await prisma.question.create({
          data: {
            correctOption: fixture.correctOption,
            createdByTeacherId: teacherProfileId,
            explanation: fixture.explanation,
            isActive: true,
            optionA: fixture.optionA,
            optionB: fixture.optionB,
            optionC: fixture.optionC,
            optionD: fixture.optionD,
            questionText: fixture.questionText,
            subjectId: subject.id,
          },
        });

    questions[index] = question;
  }

  const existingBankSoal = await prisma.bankSoal.findFirst({
    where: {
      createdByTeacherId: teacherProfileId,
      subjectId: subject.id,
      title: "Bank Soal Agama 1",
    },
    select: {
      id: true,
    },
  });

  const bankSoal = existingBankSoal
    ? await prisma.bankSoal.update({
        where: {
          id: existingBankSoal.id,
        },
        data: {
          description: "Bank soal fixture untuk pengujian alur tryout siswa.",
          isActive: true,
        },
      })
    : await prisma.bankSoal.create({
        data: {
          createdByTeacherId: teacherProfileId,
          description: "Bank soal fixture untuk pengujian alur tryout siswa.",
          isActive: true,
          subjectId: subject.id,
          title: "Bank Soal Agama 1",
        },
      });

  await prisma.bankSoalQuestion.deleteMany({
    where: {
      bankSoalId: bankSoal.id,
    },
  });

  await prisma.bankSoalQuestion.createMany({
    data: questions.map((question, index) => ({
      bankSoalId: bankSoal.id,
      orderNumber: index + 1,
      questionId: question.id,
    })),
  });

  const existingTryout = await prisma.tryout.findFirst({
    where: {
      createdByTeacherId: teacherProfileId,
      subjectId: subject.id,
      title: "Tryout E2E Agama 1",
    },
    select: {
      id: true,
    },
  });

  const tryout = existingTryout
    ? await prisma.tryout.update({
        where: {
          id: existingTryout.id,
        },
        data: {
          bankSoalId: bankSoal.id,
          description: "Tryout fixture untuk menguji flow siswa dari mulai sampai submit hasil.",
          durationMinutes: 25,
          isPublished: true,
          subjectId: subject.id,
        },
      })
    : await prisma.tryout.create({
        data: {
          bankSoalId: bankSoal.id,
          createdByTeacherId: teacherProfileId,
          description: "Tryout fixture untuk menguji flow siswa dari mulai sampai submit hasil.",
          durationMinutes: 25,
          isPublished: true,
          subjectId: subject.id,
          title: "Tryout E2E Agama 1",
        },
      });

  await prisma.tryoutQuestion.deleteMany({
    where: {
      tryoutId: tryout.id,
    },
  });

  await prisma.tryoutQuestion.createMany({
    data: questions.map((question, index) => ({
      orderNumber: index + 1,
      questionId: question.id,
      tryoutId: tryout.id,
    })),
  });

  await prisma.tryoutSession.deleteMany({
    where: {
      studentId: studentProfileId,
      tryoutId: tryout.id,
    },
  });

  return {
    questionCount: questions.length,
    subjectName: subject.name,
    tryoutTitle: tryout.title,
  };
}

async function main() {
  await seedAdmin();
  const teacherProfile = await seedTeacher();
  const studentProfile = await seedStudent();
  const tryoutFlowData = await seedTryoutFlowData({
    studentProfileId: studentProfile.id,
    teacherProfileId: teacherProfile.id,
  });

  console.log("Seed selesai dibuat.");
  console.log("Admin  : admin@sekolah.sch.id / Admin123!");
  console.log("Guru   : guru@sekolah.sch.id / Guru123!");
  console.log("Siswa  : NISN 1234567890");
  console.log(
    `Tryout : ${tryoutFlowData.tryoutTitle} (${tryoutFlowData.subjectName}, ${tryoutFlowData.questionCount} soal)`,
  );
  console.log("Catatan: sesi tryout siswa untuk fixture ini direset agar flow bisa dites ulang.");
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
