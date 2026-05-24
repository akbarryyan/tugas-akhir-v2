import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { URL } from "node:url";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaPkg from "@prisma/client";

const {
  AuthMethod,
  AutoMethod,
  AnswerOption,
  LabelSource,
  LearningAspect,
  PrismaClient,
  Role,
  SentimentLabel,
  TryoutStatus,
} = prismaPkg;

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

// ─── Users ────────────────────────────────────────────────────────────────────

async function seedAdmin() {
  await prisma.user.upsert({
    where: { email: "admin@sekolah.sch.id" },
    create: {
      authMethod: AuthMethod.EMAIL_PASSWORD,
      email: "admin@sekolah.sch.id",
      name: "Administrator Sekolah",
      passwordHash: hashPassword("Admin123!"),
      role: Role.ADMIN,
    },
    update: {
      authMethod: AuthMethod.EMAIL_PASSWORD,
      name: "Administrator Sekolah",
      passwordHash: hashPassword("Admin123!"),
      role: Role.ADMIN,
    },
  });
}

async function seedTeachers() {
  const teachers = [
    {
      email: "guru@sekolah.sch.id",
      name: "Budi Santoso",
      nip: "198812312024011001",
      password: "Guru123!",
    },
    {
      email: "guru2@sekolah.sch.id",
      name: "Siti Rahayu",
      nip: "198512182024012002",
      password: "Guru123!",
    },
  ];

  const profiles = [];

  for (const teacher of teachers) {
    const user = await prisma.user.upsert({
      where: { email: teacher.email },
      create: {
        authMethod: AuthMethod.EMAIL_PASSWORD,
        email: teacher.email,
        name: teacher.name,
        passwordHash: hashPassword(teacher.password),
        role: Role.GURU,
      },
      update: {
        authMethod: AuthMethod.EMAIL_PASSWORD,
        name: teacher.name,
        passwordHash: hashPassword(teacher.password),
        role: Role.GURU,
      },
    });

    const profile = await prisma.teacherProfile.upsert({
      where: { nip: teacher.nip },
      create: { nip: teacher.nip, userId: user.id },
      update: { userId: user.id },
    });

    profiles.push({ ...profile, email: teacher.email, name: teacher.name });
  }

  return profiles;
}

async function seedStudents() {
  const students = [
    { name: "Aulia Rahma", nisn: "1234567890", className: "XII IPA 1" },
    { name: "Rizki Pratama", nisn: "0987654321", className: "XII IPA 1" },
    { name: "Dewi Lestari", nisn: "1122334455", className: "XII IPS 2" },
    { name: "Fajar Nugroho", nisn: "9988776655", className: "XII IPA 2" },
  ];

  const profiles = [];

  for (const student of students) {
    const existing = await prisma.studentProfile.findUnique({
      where: { nisn: student.nisn },
      include: { user: true },
    });

    let profile;

    if (existing) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { authMethod: AuthMethod.NISN, name: student.name, role: Role.SISWA },
      });
      profile = await prisma.studentProfile.update({
        where: { id: existing.id },
        data: { className: student.className },
      });
    } else {
      const user = await prisma.user.create({
        data: { authMethod: AuthMethod.NISN, name: student.name, role: Role.SISWA },
      });
      profile = await prisma.studentProfile.create({
        data: { className: student.className, nisn: student.nisn, userId: user.id },
      });
    }

    profiles.push({ ...profile, name: student.name });
  }

  return profiles;
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

async function upsertSubject(name, description) {
  return prisma.subject.upsert({
    where: { name },
    create: { description, isActive: true, name },
    update: { description, isActive: true },
  });
}

async function assignTeacherToSubject(teacherId, subjectId) {
  await prisma.subjectTeacher.upsert({
    where: { subjectId_teacherId: { subjectId, teacherId } },
    create: { subjectId, teacherId },
    update: {},
  });
}

// ─── Questions ────────────────────────────────────────────────────────────────

async function upsertQuestion(teacherId, subjectId, fixture) {
  const existing = await prisma.question.findFirst({
    where: { createdByTeacherId: teacherId, questionText: fixture.questionText, subjectId },
    select: { id: true },
  });

  if (existing) {
    return prisma.question.update({
      where: { id: existing.id },
      data: {
        correctOption: fixture.correctOption,
        explanation: fixture.explanation,
        isActive: true,
        optionA: fixture.optionA,
        optionB: fixture.optionB,
        optionC: fixture.optionC,
        optionD: fixture.optionD,
      },
    });
  }

  return prisma.question.create({
    data: {
      correctOption: fixture.correctOption,
      createdByTeacherId: teacherId,
      explanation: fixture.explanation,
      isActive: true,
      optionA: fixture.optionA,
      optionB: fixture.optionB,
      optionC: fixture.optionC,
      optionD: fixture.optionD,
      questionText: fixture.questionText,
      subjectId,
    },
  });
}

async function upsertBankSoal(teacherId, subjectId, title, questions) {
  const existing = await prisma.bankSoal.findFirst({
    where: { createdByTeacherId: teacherId, subjectId, title },
    select: { id: true },
  });

  const bankSoal = existing
    ? await prisma.bankSoal.update({
        where: { id: existing.id },
        data: { description: `Bank soal ${title}.`, isActive: true },
      })
    : await prisma.bankSoal.create({
        data: {
          createdByTeacherId: teacherId,
          description: `Bank soal ${title}.`,
          isActive: true,
          subjectId,
          title,
        },
      });

  await prisma.bankSoalQuestion.deleteMany({ where: { bankSoalId: bankSoal.id } });
  await prisma.bankSoalQuestion.createMany({
    data: questions.map((q, i) => ({ bankSoalId: bankSoal.id, orderNumber: i + 1, questionId: q.id })),
  });

  return bankSoal;
}

async function upsertTryout(teacherId, subjectId, bankSoalId, title, durationMinutes, questions) {
  const existing = await prisma.tryout.findFirst({
    where: { createdByTeacherId: teacherId, subjectId, title },
    select: { id: true },
  });

  const tryout = existing
    ? await prisma.tryout.update({
        where: { id: existing.id },
        data: { bankSoalId, durationMinutes, isPublished: true, subjectId },
      })
    : await prisma.tryout.create({
        data: {
          bankSoalId,
          createdByTeacherId: teacherId,
          description: `Paket tryout ${title} untuk siswa.`,
          durationMinutes,
          isPublished: true,
          subjectId,
          title,
        },
      });

  await prisma.tryoutQuestion.deleteMany({ where: { tryoutId: tryout.id } });
  await prisma.tryoutQuestion.createMany({
    data: questions.map((q, i) => ({ orderNumber: i + 1, questionId: q.id, tryoutId: tryout.id })),
  });

  return tryout;
}

// ─── Completed Sessions ───────────────────────────────────────────────────────

async function seedCompletedSession({ studentProfileId, subjectId, tryoutId, answerPlan, feedbackPlan }) {
  // Idempoten: cek apakah session GRADED sudah ada
  const existingSession = await prisma.tryoutSession.findFirst({
    where: { studentId: studentProfileId, tryoutId, status: TryoutStatus.GRADED },
    select: { id: true },
  });

  if (existingSession) {
    return existingSession;
  }

  // Hapus session IN_PROGRESS lama jika ada
  await prisma.tryoutSession.deleteMany({
    where: { studentId: studentProfileId, tryoutId, status: TryoutStatus.IN_PROGRESS },
  });

  const correctAnswers = answerPlan.filter((a) => a.isCorrect).length;
  const totalQuestions = answerPlan.length;
  const score = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));
  const submittedAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

  const session = await prisma.tryoutSession.create({
    data: {
      correctAnswers,
      score,
      startedAt: new Date(submittedAt.getTime() - 20 * 60 * 1000),
      status: TryoutStatus.GRADED,
      studentId: studentProfileId,
      submittedAt,
      totalQuestions,
      tryoutId,
    },
  });

  await prisma.tryoutAnswer.createMany({
    data: answerPlan.map((a) => ({
      answeredAt: submittedAt,
      isCorrect: a.isCorrect,
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      tryoutSessionId: session.id,
    })),
  });

  for (const fp of feedbackPlan) {
    const feedback = await prisma.feedback.upsert({
      where: {
        tryoutSessionId_aspect: { aspect: fp.aspect, tryoutSessionId: session.id },
      },
      create: {
        aspect: fp.aspect,
        comment: fp.comment,
        studentId: studentProfileId,
        subjectId,
        tryoutSessionId: session.id,
      },
      update: { comment: fp.comment },
    });

    await prisma.sentimentAnalysis.upsert({
      where: { feedbackId: feedback.id },
      create: {
        analyzedAt: submittedAt,
        autoConfidence: fp.confidence,
        autoLabel: fp.label,
        autoMethod: AutoMethod.LEXICON,
        feedbackId: feedback.id,
        finalLabel: fp.label,
        labelSource: LabelSource.AUTO,
        modelVersion: "nb-v1",
        preprocessedText: fp.comment.toLowerCase().replace(/[.,!?]/g, "").trim(),
      },
      update: {
        autoConfidence: fp.confidence,
        autoLabel: fp.label,
        autoMethod: AutoMethod.LEXICON,
        finalLabel: fp.label,
        labelSource: LabelSource.AUTO,
        modelVersion: "nb-v1",
        preprocessedText: fp.comment.toLowerCase().replace(/[.,!?]/g, "").trim(),
      },
    });
  }

  return session;
}

// ─── Subject Fixtures ─────────────────────────────────────────────────────────

const agamaQuestionFixtures = [
  {
    correctOption: AnswerOption.C,
    explanation: "Rukun iman berjumlah enam.",
    optionA: "Empat",
    optionB: "Lima",
    optionC: "Enam",
    optionD: "Tujuh",
    questionText: "Berapa jumlah rukun iman?",
  },
  {
    correctOption: AnswerOption.B,
    explanation: "Kitab suci umat Islam adalah Al-Qur'an.",
    optionA: "Injil",
    optionB: "Al-Qur'an",
    optionC: "Taurat",
    optionD: "Zabur",
    questionText: "Kitab suci umat Islam adalah?",
  },
  {
    correctOption: AnswerOption.A,
    explanation: "Salat Subuh terdiri dari 2 rakaat.",
    optionA: "2 rakaat",
    optionB: "3 rakaat",
    optionC: "4 rakaat",
    optionD: "5 rakaat",
    questionText: "Jumlah rakaat salat Subuh adalah?",
  },
  {
    correctOption: AnswerOption.D,
    explanation: "Puasa Ramadan hukumnya wajib bagi muslim yang memenuhi syarat.",
    optionA: "Sunnah",
    optionB: "Makruh",
    optionC: "Mubah",
    optionD: "Wajib",
    questionText: "Hukum puasa Ramadan bagi muslim yang memenuhi syarat adalah?",
  },
  {
    correctOption: AnswerOption.B,
    explanation: "Zakat fitrah ditunaikan sebelum salat Idulfitri.",
    optionA: "Sesudah Idulfitri",
    optionB: "Sebelum salat Idulfitri",
    optionC: "Awal Ramadan saja",
    optionD: "Kapan saja tanpa batas",
    questionText: "Waktu utama membayar zakat fitrah adalah?",
  },
];

// correctOptions: C, B, A, D, B  (index 0–4)
const agamaAnswerPlans = {
  aulia: [
    // 4 benar → 80
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: true },
    { selectedOption: AnswerOption.D, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false }, // salah, benar B
  ],
  rizki: [
    // 3 benar → 60
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false },
    { selectedOption: AnswerOption.A, isCorrect: true },
    { selectedOption: AnswerOption.D, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false },
  ],
  dewi: [
    // 5 benar → 100
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: true },
    { selectedOption: AnswerOption.D, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
  ],
};

const matematikaQuestionFixtures = [
  {
    correctOption: AnswerOption.C,
    explanation: "7 × 8 = 56.",
    optionA: "48",
    optionB: "54",
    optionC: "56",
    optionD: "64",
    questionText: "Hasil dari 7 × 8 adalah?",
  },
  {
    correctOption: AnswerOption.B,
    explanation: "√144 = 12 karena 12 × 12 = 144.",
    optionA: "11",
    optionB: "12",
    optionC: "13",
    optionD: "14",
    questionText: "Nilai dari √144 adalah?",
  },
  {
    correctOption: AnswerOption.C,
    explanation: "x + 5 = 12, maka x = 12 − 5 = 7.",
    optionA: "5",
    optionB: "6",
    optionC: "7",
    optionD: "8",
    questionText: "Jika x + 5 = 12, maka nilai x adalah?",
  },
  {
    correctOption: AnswerOption.D,
    explanation: "Luas persegi = sisi × sisi = 9 × 9 = 81 cm².",
    optionA: "36 cm²",
    optionB: "45 cm²",
    optionC: "72 cm²",
    optionD: "81 cm²",
    questionText: "Luas persegi dengan sisi 9 cm adalah?",
  },
  {
    correctOption: AnswerOption.A,
    explanation: "¾ × 100% = 75%.",
    optionA: "75%",
    optionB: "70%",
    optionC: "80%",
    optionD: "25%",
    questionText: "Pecahan ¾ jika diubah ke persen adalah?",
  },
];

// correctOptions: C, B, C, D, A
const matematikaAnswerPlans = {
  aulia: [
    // 3 benar → 60
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false }, // salah, benar D
    { selectedOption: AnswerOption.B, isCorrect: false }, // salah, benar A
  ],
  rizki: [
    // 5 benar → 100
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.D, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: true },
  ],
  dewi: [
    // 2 benar → 40
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false },
    { selectedOption: AnswerOption.B, isCorrect: false },
    { selectedOption: AnswerOption.D, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: false },
  ],
};

const bahasaIndonesiaQuestionFixtures = [
  {
    correctOption: AnswerOption.B,
    explanation: "Sinonim 'bijaksana' adalah arif, bermakna penuh kebijakan.",
    optionA: "Pandai",
    optionB: "Arif",
    optionC: "Berani",
    optionD: "Jujur",
    questionText: "Sinonim dari kata 'bijaksana' adalah?",
  },
  {
    correctOption: AnswerOption.C,
    explanation: "Antonim 'rajin' adalah malas.",
    optionA: "Tekun",
    optionB: "Giat",
    optionC: "Malas",
    optionD: "Aktif",
    questionText: "Antonim dari kata 'rajin' adalah?",
  },
  {
    correctOption: AnswerOption.A,
    explanation: "Penulisan baku adalah 'apotek', bukan 'apotik'.",
    optionA: "Apotek",
    optionB: "Apotik",
    optionC: "Apoteke",
    optionD: "Apoteck",
    questionText: "Penulisan ejaan baku yang benar adalah?",
  },
  {
    correctOption: AnswerOption.B,
    explanation: "Tanda tanya (?) digunakan di akhir kalimat tanya.",
    optionA: ".",
    optionB: "?",
    optionC: "!",
    optionD: ";",
    questionText: "Tanda baca yang digunakan di akhir kalimat tanya adalah?",
  },
  {
    correctOption: AnswerOption.D,
    explanation: "Paragraf dengan gagasan utama di awal disebut paragraf deduktif.",
    optionA: "Induktif",
    optionB: "Campuran",
    optionC: "Ineratif",
    optionD: "Deduktif",
    questionText: "Paragraf yang berisi gagasan utama di awal disebut?",
  },
];

// correctOptions: B, C, A, B, D
const bahasaIndonesiaAnswerPlans = {
  aulia: [
    // 4 benar → 80
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false }, // salah, benar D
  ],
  rizki: [
    // 4 benar → 80
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.C, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: true },
    { selectedOption: AnswerOption.B, isCorrect: true },
    { selectedOption: AnswerOption.A, isCorrect: false }, // salah, benar D
  ],
};

// ─── Feedback Templates ───────────────────────────────────────────────────────

const feedbackTemplates = {
  positif: {
    [LearningAspect.MATERI]:
      "Materi yang diajarkan sangat jelas dan mudah dipahami. Penjelasannya runtut dan terstruktur sehingga saya bisa mengikuti dengan baik.",
    [LearningAspect.PENYAMPAIAN]:
      "Cara guru menyampaikan materi sangat menarik dan memotivasi. Penjelasan selalu disertai contoh yang relevan sehingga mudah dipahami.",
    [LearningAspect.SOAL]:
      "Soal-soal yang diberikan sangat relevan dengan materi dan membantu pemahaman. Tingkat kesulitannya sesuai dan variasinya bagus.",
  },
  negatif: {
    [LearningAspect.MATERI]:
      "Materi yang disampaikan kurang lengkap dan banyak bagian penting yang tidak dijelaskan. Saya masih bingung dengan beberapa konsep.",
    [LearningAspect.PENYAMPAIAN]:
      "Penjelasan guru terlalu cepat dan sulit untuk diikuti. Saya sering tidak paham dan harus mencari penjelasan dari sumber lain.",
    [LearningAspect.SOAL]:
      "Soal tryout tidak sesuai dengan materi yang diajarkan. Banyak soal yang membingungkan dan tidak relevan dengan pembelajaran.",
  },
  netral: {
    [LearningAspect.MATERI]:
      "Materi cukup baik, namun ada beberapa bagian yang masih perlu penjelasan lebih lanjut agar lebih mudah dipahami.",
    [LearningAspect.PENYAMPAIAN]:
      "Penyampaian sudah cukup jelas, namun bisa lebih baik jika disertai lebih banyak contoh dan latihan soal yang beragam.",
    [LearningAspect.SOAL]:
      "Soal yang diberikan cukup memadai, meskipun ada beberapa yang tingkat kesulitannya tidak merata sehingga perlu disesuaikan.",
  },
};

const labelConfidence = {
  [SentimentLabel.POSITIF]: 0.88,
  [SentimentLabel.NEGATIF]: 0.86,
  [SentimentLabel.NETRAL]: 0.68,
};

function makeFeedbackPlan(plan) {
  return Object.entries(plan).map(([aspect, label]) => ({
    aspect,
    comment: feedbackTemplates[label === SentimentLabel.POSITIF ? "positif" : label === SentimentLabel.NEGATIF ? "negatif" : "netral"][aspect],
    confidence: labelConfidence[label],
    label,
  }));
}

// ─── Session Plans ────────────────────────────────────────────────────────────

/*
  Distribution yang dihasilkan (total 24 sentimen, 8 sesi × 3 aspek):

  MATERI:      5 Positif, 2 Negatif, 1 Netral
  PENYAMPAIAN: 5 Positif, 1 Negatif, 2 Netral
  SOAL:        3 Positif, 2 Negatif, 3 Netral
  ──────────────────────────────────────────
  TOTAL:       13 Positif, 5 Negatif, 6 Netral
*/
const sessionPlans = [
  {
    student: "aulia",
    subject: "agama",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.POSITIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.POSITIF,
      [LearningAspect.SOAL]: SentimentLabel.NETRAL,
    },
  },
  {
    student: "rizki",
    subject: "agama",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.NEGATIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.NETRAL,
      [LearningAspect.SOAL]: SentimentLabel.NEGATIF,
    },
  },
  {
    student: "dewi",
    subject: "agama",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.POSITIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.POSITIF,
      [LearningAspect.SOAL]: SentimentLabel.POSITIF,
    },
  },
  {
    student: "aulia",
    subject: "matematika",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.NETRAL,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.NEGATIF,
      [LearningAspect.SOAL]: SentimentLabel.NETRAL,
    },
  },
  {
    student: "rizki",
    subject: "matematika",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.POSITIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.POSITIF,
      [LearningAspect.SOAL]: SentimentLabel.POSITIF,
    },
  },
  {
    student: "dewi",
    subject: "matematika",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.NEGATIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.POSITIF,
      [LearningAspect.SOAL]: SentimentLabel.NEGATIF,
    },
  },
  {
    student: "aulia",
    subject: "bahasaIndonesia",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.POSITIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.NETRAL,
      [LearningAspect.SOAL]: SentimentLabel.POSITIF,
    },
  },
  {
    student: "rizki",
    subject: "bahasaIndonesia",
    feedbackPlan: {
      [LearningAspect.MATERI]: SentimentLabel.POSITIF,
      [LearningAspect.PENYAMPAIAN]: SentimentLabel.POSITIF,
      [LearningAspect.SOAL]: SentimentLabel.NETRAL,
    },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Menjalankan seed...\n");

  await seedAdmin();
  console.log("✓ Admin selesai");

  const teachers = await seedTeachers();
  const teacherMap = Object.fromEntries(teachers.map((t) => [t.email, t]));
  const guruBudi = teacherMap["guru@sekolah.sch.id"];
  const guruSiti = teacherMap["guru2@sekolah.sch.id"];
  console.log("✓ Guru selesai (2 guru)");

  const students = await seedStudents();
  const studentMap = {
    aulia: students.find((s) => s.name === "Aulia Rahma"),
    rizki: students.find((s) => s.name === "Rizki Pratama"),
    dewi: students.find((s) => s.name === "Dewi Lestari"),
  };
  console.log("✓ Siswa selesai (4 siswa)");

  // Subjects
  const agama = await upsertSubject("Agama", "Mata pelajaran Pendidikan Agama Islam.");
  const matematika = await upsertSubject("Matematika", "Mata pelajaran Matematika tingkat SMA.");
  const bahasaIndonesia = await upsertSubject("Bahasa Indonesia", "Mata pelajaran Bahasa dan Sastra Indonesia.");
  console.log("✓ Mata pelajaran selesai (Agama, Matematika, Bahasa Indonesia)");

  // Assignments
  await assignTeacherToSubject(guruBudi.id, agama.id);
  await assignTeacherToSubject(guruSiti.id, matematika.id);
  await assignTeacherToSubject(guruSiti.id, bahasaIndonesia.id);
  console.log("✓ Penugasan pengampu selesai");

  // Questions
  const agamaQuestions = [];
  for (const f of agamaQuestionFixtures) {
    agamaQuestions.push(await upsertQuestion(guruBudi.id, agama.id, f));
  }

  const matematikaQuestions = [];
  for (const f of matematikaQuestionFixtures) {
    matematikaQuestions.push(await upsertQuestion(guruSiti.id, matematika.id, f));
  }

  const bahasaIndonesiaQuestions = [];
  for (const f of bahasaIndonesiaQuestionFixtures) {
    bahasaIndonesiaQuestions.push(await upsertQuestion(guruSiti.id, bahasaIndonesia.id, f));
  }
  console.log("✓ Soal selesai (5 soal × 3 mapel = 15 soal)");

  // Bank soal
  const agamaBankSoal = await upsertBankSoal(guruBudi.id, agama.id, "Bank Soal Agama 1", agamaQuestions);
  const matematikaBankSoal = await upsertBankSoal(guruSiti.id, matematika.id, "Bank Soal Matematika 1", matematikaQuestions);
  const bahasaIndonesiaBankSoal = await upsertBankSoal(guruSiti.id, bahasaIndonesia.id, "Bank Soal Bahasa Indonesia 1", bahasaIndonesiaQuestions);
  console.log("✓ Bank soal selesai (3 bank soal)");

  // Tryouts
  const agamaTryout = await upsertTryout(guruBudi.id, agama.id, agamaBankSoal.id, "Tryout Agama Paket 1", 25, agamaQuestions);
  const matematikaTryout = await upsertTryout(guruSiti.id, matematika.id, matematikaBankSoal.id, "Tryout Matematika Paket 1", 30, matematikaQuestions);
  const bahasaIndonesiaTryout = await upsertTryout(guruSiti.id, bahasaIndonesia.id, bahasaIndonesiaBankSoal.id, "Tryout Bahasa Indonesia Paket 1", 30, bahasaIndonesiaQuestions);
  console.log("✓ Tryout selesai (3 tryout, semua published)");

  // Map subject & tryout untuk session plans
  const subjectMap = { agama, matematika, bahasaIndonesia };
  const tryoutMap = { agama: agamaTryout, matematika: matematikaTryout, bahasaIndonesia: bahasaIndonesiaTryout };
  const answerPlanMap = {
    agama: agamaAnswerPlans,
    matematika: matematikaAnswerPlans,
    bahasaIndonesia: bahasaIndonesiaAnswerPlans,
  };
  const questionMap = {
    agama: agamaQuestions,
    matematika: matematikaQuestions,
    bahasaIndonesia: bahasaIndonesiaQuestions,
  };

  // Completed sessions + feedback + sentiment
  let sessionCount = 0;

  for (const plan of sessionPlans) {
    const student = studentMap[plan.student];
    const subject = subjectMap[plan.subject];
    const tryout = tryoutMap[plan.subject];
    const questions = questionMap[plan.subject];
    const rawAnswerPlan = answerPlanMap[plan.subject]?.[plan.student];

    if (!student || !subject || !tryout || !rawAnswerPlan) {
      continue;
    }

    const answerPlan = rawAnswerPlan.map((a, i) => ({
      ...a,
      questionId: questions[i].id,
    }));

    await seedCompletedSession({
      answerPlan,
      feedbackPlan: makeFeedbackPlan(plan.feedbackPlan),
      studentProfileId: student.id,
      subjectId: subject.id,
      tryoutId: tryout.id,
    });

    sessionCount++;
  }

  console.log(`✓ Sesi tryout selesai (${sessionCount} sesi dengan jawaban, feedback, dan sentimen)`);

  console.log("\n─────────────────────────────────────");
  console.log("Seed berhasil!");
  console.log("─────────────────────────────────────");
  console.log("Login:");
  console.log("  Admin  → admin@sekolah.sch.id   / Admin123!");
  console.log("  Guru 1 → guru@sekolah.sch.id    / Guru123!  (Agama)");
  console.log("  Guru 2 → guru2@sekolah.sch.id   / Guru123!  (Matematika, Bahasa Indonesia)");
  console.log("  Siswa  → NISN: 1234567890  (Aulia Rahma)   — semua tryout selesai");
  console.log("           NISN: 0987654321  (Rizki Pratama) — semua tryout selesai");
  console.log("           NISN: 1122334455  (Dewi Lestari)  — 1 tryout tersisa (B.Indo)");
  console.log("           NISN: 9988776655  (Fajar Nugroho) — belum ada sesi, cocok utk test live NLP");
  console.log("");
  console.log("Data tersedia:");
  console.log("  3 mata pelajaran, 15 soal, 3 tryout (published)");
  console.log("  8 sesi tryout selesai, 24 feedback, 24 sentimen teranalisis");
  console.log("  Distribusi: ~13 Positif, ~5 Negatif, ~6 Netral");
  console.log("─────────────────────────────────────");
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
