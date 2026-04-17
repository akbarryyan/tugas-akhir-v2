"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const bankSoalSchema = z.object({
  description: z.string().trim().optional(),
  isActive: z.boolean(),
  questionIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu soal untuk bank soal."),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih."),
  title: z.string().trim().min(3, "Nama bank soal minimal 3 karakter."),
});

const bankSoalUpdateSchema = bankSoalSchema.extend({
  bankSoalId: z.string().min(1),
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
    return error.issues[0]?.message ?? "Data bank soal belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Data bank soal serupa sudah terdaftar.";
    }

    if (error.code === "P2003") {
      return "Bank soal masih terhubung dengan data lain dan belum bisa diproses.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses data bank soal.";
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

async function assertQuestionSelectionBelongsToSubject(
  teacherId: string,
  subjectId: string,
  questionIds: string[],
) {
  const selectedQuestions = await prisma.question.findMany({
    where: {
      createdByTeacherId: teacherId,
      id: {
        in: questionIds,
      },
      isActive: true,
      subjectId,
    },
    select: {
      id: true,
    },
  });

  if (selectedQuestions.length !== questionIds.length) {
    throw new Error("Beberapa soal yang dipilih tidak valid untuk mata pelajaran ini.");
  }
}

function getBankSoalPayload(formData: FormData) {
  return {
    description: formData.get("description"),
    isActive: formData.get("isActive") === "on",
    questionIds: formData
      .getAll("questionIds")
      .map((value) => String(value).trim())
      .filter(Boolean),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
  };
}

export async function createBankSoalAction(formData: FormData) {
  try {
    const parsedData = bankSoalSchema.parse(getBankSoalPayload(formData));
    const context = await getTeacherContext();

    if (!context.subjectIds.includes(parsedData.subjectId)) {
      throw new Error("Mata pelajaran ini tidak termasuk mapel yang Anda ampu.");
    }

    await assertQuestionSelectionBelongsToSubject(
      context.teacherId,
      parsedData.subjectId,
      parsedData.questionIds,
    );

    await prisma.bankSoal.create({
      data: {
        createdByTeacherId: context.teacherId,
        description: parsedData.description || null,
        isActive: parsedData.isActive,
        subjectId: parsedData.subjectId,
        title: parsedData.title,
        bankSoalQuestions: {
          create: parsedData.questionIds.map((questionId, index) => ({
            orderNumber: index + 1,
            questionId,
          })),
        },
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/bank-soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/bank-soal");
  revalidatePath("/guru/tryout");
  redirectWithMessage(
    "/guru/bank-soal",
    "success",
    "Bank soal berhasil dibuat.",
  );
}

export async function updateBankSoalAction(formData: FormData) {
  let bankSoalId = "";

  try {
    const parsedData = bankSoalUpdateSchema.parse({
      ...getBankSoalPayload(formData),
      bankSoalId: formData.get("bankSoalId"),
    });
    bankSoalId = parsedData.bankSoalId;
    const context = await getTeacherContext();

    if (!context.subjectIds.includes(parsedData.subjectId)) {
      throw new Error("Mata pelajaran ini tidak termasuk mapel yang Anda ampu.");
    }

    const existingBankSoal = await prisma.bankSoal.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: parsedData.bankSoalId,
      },
      select: {
        id: true,
      },
    });

    if (!existingBankSoal) {
      throw new Error("Bank soal tidak ditemukan atau tidak dapat Anda ubah.");
    }

    await assertQuestionSelectionBelongsToSubject(
      context.teacherId,
      parsedData.subjectId,
      parsedData.questionIds,
    );

    await prisma.$transaction(async (tx) => {
      await tx.bankSoal.update({
        where: {
          id: parsedData.bankSoalId,
        },
        data: {
          description: parsedData.description || null,
          isActive: parsedData.isActive,
          subjectId: parsedData.subjectId,
          title: parsedData.title,
        },
      });

      await tx.bankSoalQuestion.deleteMany({
        where: {
          bankSoalId: parsedData.bankSoalId,
        },
      });

      await tx.bankSoalQuestion.createMany({
        data: parsedData.questionIds.map((questionId, index) => ({
          bankSoalId: parsedData.bankSoalId,
          orderNumber: index + 1,
          questionId,
        })),
      });
    });
  } catch (error) {
    redirectWithMessage("/guru/bank-soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/bank-soal");
  revalidatePath("/guru/tryout");
  revalidatePath(`/guru/bank-soal/${bankSoalId}`);
  redirectWithMessage(
    "/guru/bank-soal",
    "success",
    "Bank soal berhasil diperbarui.",
  );
}

export async function toggleBankSoalStatusAction(formData: FormData) {
  let bankSoalId = "";

  try {
    bankSoalId = z.string().min(1).parse(formData.get("bankSoalId"));
    const isActive = formData.get("isActive") === "true";
    const context = await getTeacherContext();

    const existingBankSoal = await prisma.bankSoal.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: bankSoalId,
      },
      select: {
        id: true,
      },
    });

    if (!existingBankSoal) {
      throw new Error("Bank soal tidak ditemukan atau tidak dapat Anda ubah.");
    }

    await prisma.bankSoal.update({
      where: {
        id: bankSoalId,
      },
      data: {
        isActive,
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/bank-soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/bank-soal");
  revalidatePath("/guru/tryout");
  revalidatePath(`/guru/bank-soal/${bankSoalId}`);
  redirectWithMessage(
    "/guru/bank-soal",
    "success",
    "Status bank soal berhasil diperbarui.",
  );
}

export async function deleteBankSoalAction(formData: FormData) {
  let bankSoalId = "";

  try {
    bankSoalId = z.string().min(1).parse(formData.get("bankSoalId"));
    const context = await getTeacherContext();

    const existingBankSoal = await prisma.bankSoal.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: bankSoalId,
      },
      select: {
        id: true,
      },
    });

    if (!existingBankSoal) {
      throw new Error("Bank soal tidak ditemukan atau tidak dapat Anda hapus.");
    }

    await prisma.bankSoal.delete({
      where: {
        id: bankSoalId,
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/bank-soal", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/bank-soal");
  revalidatePath("/guru/tryout");
  revalidatePath(`/guru/bank-soal/${bankSoalId}`);
  redirectWithMessage("/guru/bank-soal", "success", "Bank soal berhasil dihapus.");
}
