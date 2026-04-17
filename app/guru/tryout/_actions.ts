"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const tryoutSchema = z.object({
  bankSoalId: z.string().min(1, "Bank soal wajib dipilih."),
  description: z.string().trim().optional(),
  durationMinutes: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    })
    .refine(
      (value) => value === null || (Number.isInteger(value) && value > 0),
      "Durasi harus berupa angka lebih dari 0 menit.",
    ),
  isPublished: z.boolean(),
  questionIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu soal untuk tryout."),
  title: z.string().trim().min(3, "Judul tryout minimal 3 karakter."),
});

const tryoutUpdateSchema = tryoutSchema.extend({
  tryoutId: z.string().min(1),
});

const tryoutToggleSchema = z.object({
  isPublished: z.boolean(),
  tryoutId: z.string().min(1),
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

function getRedirectTarget(formData: FormData, fallbackPath: string) {
  const value = formData.get("redirectTo");

  if (typeof value !== "string") {
    return fallbackPath;
  }

  const trimmedValue = value.trim();
  return trimmedValue || fallbackPath;
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Data yang dikirim belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Data yang sama sudah terdaftar. Periksa kembali input Anda.";
    }

    if (error.code === "P2003") {
      return "Data masih terhubung dengan entitas lain dan belum bisa diproses.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses data tryout.";
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

async function getTeacherBankSoalContext(bankSoalId: string, teacherId: string) {
  const bankSoal = await prisma.bankSoal.findFirst({
    where: {
      createdByTeacherId: teacherId,
      id: bankSoalId,
      isActive: true,
    },
    select: {
      id: true,
      subjectId: true,
    },
  });

  if (!bankSoal) {
    throw new Error("Bank soal tidak ditemukan atau belum aktif.");
  }

  return bankSoal;
}

async function assertQuestionSelectionBelongsToBankSoal(
  bankSoalId: string,
  questionIds: string[],
) {
  const selectedQuestions = await prisma.bankSoalQuestion.findMany({
    where: {
      bankSoalId,
      questionId: {
        in: questionIds,
      },
      question: {
        isActive: true,
      },
    },
    select: {
      questionId: true,
    },
  });

  if (selectedQuestions.length !== questionIds.length) {
    throw new Error("Beberapa soal yang dipilih tidak termasuk dalam bank soal ini.");
  }
}

function getTryoutPayload(formData: FormData) {
  return {
    bankSoalId: formData.get("bankSoalId"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    isPublished: formData.get("isPublished") === "on",
    questionIds: formData
      .getAll("questionIds")
      .map((value) => String(value).trim())
      .filter(Boolean),
    title: formData.get("title"),
  };
}

export async function createTryoutAction(formData: FormData) {
  try {
    const parsedData = tryoutSchema.parse(getTryoutPayload(formData));
    const context = await getTeacherContext();
    const bankSoal = await getTeacherBankSoalContext(
      parsedData.bankSoalId,
      context.teacherId,
    );

    await assertQuestionSelectionBelongsToBankSoal(
      parsedData.bankSoalId,
      parsedData.questionIds,
    );

    await prisma.tryout.create({
      data: {
        bankSoalId: parsedData.bankSoalId,
        createdByTeacherId: context.teacherId,
        description: parsedData.description || null,
        durationMinutes: parsedData.durationMinutes,
        isPublished: parsedData.isPublished,
        subjectId: bankSoal.subjectId,
        title: parsedData.title,
        tryoutQuestions: {
          create: parsedData.questionIds.map((questionId, index) => ({
            orderNumber: index + 1,
            questionId,
          })),
        },
      },
    });
  } catch (error) {
    redirectWithMessage("/guru/tryout", "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/tryout");
  revalidatePath("/admin/tryout");
  revalidatePath("/siswa");
  redirectWithMessage(
    "/guru/tryout",
    "success",
    "Paket tryout berhasil dibuat.",
  );
}

export async function updateTryoutAction(formData: FormData) {
  let tryoutId = "";
  const redirectTarget = getRedirectTarget(formData, "/guru/tryout");

  try {
    const parsedData = tryoutUpdateSchema.parse({
      ...getTryoutPayload(formData),
      tryoutId: formData.get("tryoutId"),
    });
    tryoutId = parsedData.tryoutId;
    const context = await getTeacherContext();
    const bankSoal = await getTeacherBankSoalContext(
      parsedData.bankSoalId,
      context.teacherId,
    );

    const existingTryout = await prisma.tryout.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: parsedData.tryoutId,
      },
      select: {
        id: true,
      },
    });

    if (!existingTryout) {
      throw new Error("Tryout tidak ditemukan atau tidak dapat Anda ubah.");
    }

    await assertQuestionSelectionBelongsToBankSoal(
      parsedData.bankSoalId,
      parsedData.questionIds,
    );

    await prisma.$transaction(async (tx) => {
      await tx.tryout.update({
        where: {
          id: parsedData.tryoutId,
        },
        data: {
          bankSoalId: parsedData.bankSoalId,
          description: parsedData.description || null,
          durationMinutes: parsedData.durationMinutes,
          isPublished: parsedData.isPublished,
          subjectId: bankSoal.subjectId,
          title: parsedData.title,
        },
      });

      await tx.tryoutQuestion.deleteMany({
        where: {
          tryoutId: parsedData.tryoutId,
        },
      });

      await tx.tryoutQuestion.createMany({
        data: parsedData.questionIds.map((questionId, index) => ({
          orderNumber: index + 1,
          questionId,
          tryoutId: parsedData.tryoutId,
        })),
      });
    });
  } catch (error) {
    redirectWithMessage(redirectTarget, "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/tryout");
  revalidatePath("/admin/tryout");
  revalidatePath("/siswa");
  revalidatePath(`/guru/tryout/${tryoutId}`);
  redirectWithMessage(
    redirectTarget,
    "success",
    "Paket tryout berhasil diperbarui.",
  );
}

export async function toggleTryoutPublishAction(formData: FormData) {
  let tryoutId = "";
  const redirectTarget = getRedirectTarget(formData, "/guru/tryout");

  try {
    const parsedData = tryoutToggleSchema.parse({
      isPublished: formData.get("isPublished") === "true",
      tryoutId: formData.get("tryoutId"),
    });
    tryoutId = parsedData.tryoutId;
    const context = await getTeacherContext();

    const existingTryout = await prisma.tryout.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: parsedData.tryoutId,
      },
      select: {
        id: true,
      },
    });

    if (!existingTryout) {
      throw new Error("Tryout tidak ditemukan atau tidak dapat Anda ubah.");
    }

    await prisma.tryout.update({
      where: {
        id: parsedData.tryoutId,
      },
      data: {
        isPublished: parsedData.isPublished,
      },
    });
  } catch (error) {
    redirectWithMessage(redirectTarget, "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/tryout");
  revalidatePath("/admin/tryout");
  revalidatePath("/siswa");
  revalidatePath(`/guru/tryout/${tryoutId}`);
  redirectWithMessage(
    redirectTarget,
    "success",
    "Status publikasi tryout berhasil diperbarui.",
  );
}

export async function deleteTryoutAction(formData: FormData) {
  let tryoutId = "";
  const redirectTarget = getRedirectTarget(formData, "/guru/tryout");

  try {
    tryoutId = z.string().min(1).parse(formData.get("tryoutId"));
    const context = await getTeacherContext();

    const existingTryout = await prisma.tryout.findFirst({
      where: {
        createdByTeacherId: context.teacherId,
        id: tryoutId,
      },
      select: {
        id: true,
      },
    });

    if (!existingTryout) {
      throw new Error("Tryout tidak ditemukan atau tidak dapat Anda hapus.");
    }

    await prisma.tryout.delete({
      where: {
        id: tryoutId,
      },
    });
  } catch (error) {
    redirectWithMessage(redirectTarget, "error", getErrorMessage(error));
  }

  revalidatePath("/guru");
  revalidatePath("/guru/tryout");
  revalidatePath("/admin/tryout");
  revalidatePath("/siswa");
  revalidatePath(`/guru/tryout/${tryoutId}`);
  redirectWithMessage(redirectTarget, "success", "Paket tryout berhasil dihapus.");
}
