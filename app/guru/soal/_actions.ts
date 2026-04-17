"use server";

import { AnswerOption, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const questionSchema = z.object({
  correctOption: z.nativeEnum(AnswerOption, {
    error: "Kunci jawaban wajib dipilih.",
  }),
  explanation: z.string().trim().optional(),
  isActive: z.boolean(),
  optionA: z.string().trim().min(1, "Opsi A wajib diisi."),
  optionB: z.string().trim().min(1, "Opsi B wajib diisi."),
  optionC: z.string().trim().min(1, "Opsi C wajib diisi."),
  optionD: z.string().trim().min(1, "Opsi D wajib diisi."),
  questionText: z.string().trim().min(10, "Teks soal minimal 10 karakter."),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih."),
});

const updateQuestionSchema = questionSchema.extend({
  questionId: z.string().min(1),
});

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
) {
  const params = new URLSearchParams({
    message,
    type,
  });

  redirect(`${path}?${params.toString()}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Data soal belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Data soal serupa sudah ada. Periksa kembali input Anda.";
    }

    if (error.code === "P2003") {
      return "Data soal masih terhubung dengan entitas lain dan belum bisa diproses.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses data soal.";
}

async function getTeacherContext() {
  const session = await getCurrentSession();
  const teacherUserId = session?.user.id;

  if (!teacherUserId) {
    throw new Error("Sesi guru tidak ditemukan. Silakan masuk kembali.");
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: teacherUserId,
    },
    select: {
      id: true,
      subjectTeachers: {
        select: {
          subjectId: true,
        },
      },
    },
  });

  if (!teacherProfile) {
    throw new Error("Profil guru belum tersedia.");
  }

  return {
    subjectIds: teacherProfile.subjectTeachers.map((item) => item.subjectId),
    teacherId: teacherProfile.id,
  };
}

function getQuestionPayload(formData: FormData) {
  return {
    correctOption: formData.get("correctOption"),
    explanation: formData.get("explanation"),
    isActive: formData.get("isActive") === "on",
    optionA: formData.get("optionA"),
    optionB: formData.get("optionB"),
    optionC: formData.get("optionC"),
    optionD: formData.get("optionD"),
    questionText: formData.get("questionText"),
    subjectId: formData.get("subjectId"),
  };
}

export async function createQuestionAction(formData: FormData) {
  try {
    const parsedData = questionSchema.parse(getQuestionPayload(formData));
    const context = await getTeacherContext();

    if (!context.subjectIds.includes(parsedData.subjectId)) {
      throw new Error("Mata pelajaran ini tidak termasuk mapel yang Anda ampu.");
    }

    await prisma.question.create({
      data: {
        correctOption: parsedData.correctOption,
        createdByTeacherId: context.teacherId,
        explanation: parsedData.explanation || null,
        isActive: parsedData.isActive,
        optionA: parsedData.optionA,
        optionB: parsedData.optionB,
        optionC: parsedData.optionC,
        optionD: parsedData.optionD,
        questionText: parsedData.questionText,
        subjectId: parsedData.subjectId,
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/soal");
  revalidatePath("/guru/tryout");
  redirectWithMessage("/guru/soal", "success", "Soal berhasil ditambahkan.");
}

export async function updateQuestionAction(formData: FormData) {
  let questionId = "";

  try {
    const parsedData = updateQuestionSchema.parse({
      ...getQuestionPayload(formData),
      questionId: formData.get("questionId"),
    });
    questionId = parsedData.questionId;
    const context = await getTeacherContext();

    if (!context.subjectIds.includes(parsedData.subjectId)) {
      throw new Error("Mata pelajaran ini tidak termasuk mapel yang Anda ampu.");
    }

    const existingQuestion = await prisma.question.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: parsedData.questionId,
      },
      select: {
        id: true,
      },
    });

    if (!existingQuestion) {
      throw new Error("Soal tidak ditemukan atau tidak dapat Anda ubah.");
    }

    await prisma.question.update({
      where: {
        id: parsedData.questionId,
      },
      data: {
        correctOption: parsedData.correctOption,
        explanation: parsedData.explanation || null,
        isActive: parsedData.isActive,
        optionA: parsedData.optionA,
        optionB: parsedData.optionB,
        optionC: parsedData.optionC,
        optionD: parsedData.optionD,
        questionText: parsedData.questionText,
        subjectId: parsedData.subjectId,
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/soal");
  revalidatePath("/guru/tryout");
  revalidatePath(`/guru/soal#${questionId}`);
  redirectWithMessage("/guru/soal", "success", "Soal berhasil diperbarui.");
}

export async function toggleQuestionStatusAction(formData: FormData) {
  try {
    const questionId = z.string().min(1).parse(formData.get("questionId"));
    const isActive = formData.get("isActive") === "true";
    const context = await getTeacherContext();

    const existingQuestion = await prisma.question.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: questionId,
      },
      select: {
        id: true,
      },
    });

    if (!existingQuestion) {
      throw new Error("Soal tidak ditemukan atau tidak dapat Anda ubah.");
    }

    await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        isActive,
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/soal");
  revalidatePath("/guru/tryout");
  redirectWithMessage(
    "/guru/soal",
    "success",
    "Status soal berhasil diperbarui.",
  );
}

export async function deleteQuestionAction(formData: FormData) {
  try {
    const questionId = z.string().min(1).parse(formData.get("questionId"));
    const context = await getTeacherContext();

    const existingQuestion = await prisma.question.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: questionId,
      },
      select: {
        id: true,
      },
    });

    if (!existingQuestion) {
      throw new Error("Soal tidak ditemukan atau tidak dapat Anda hapus.");
    }

    await prisma.question.delete({
      where: {
        id: questionId,
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/soal");
  revalidatePath("/guru/tryout");
  redirectWithMessage("/guru/soal", "success", "Soal berhasil dihapus.");
}
