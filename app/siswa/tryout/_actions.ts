"use server";

import { AnswerOption, Prisma, TryoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const answerOptions = new Set(Object.values(AnswerOption));

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
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Data jawaban yang sama sudah tercatat.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menyimpan hasil tryout.";
}

function getRedirectPath(
  formData: FormData,
  fieldName: "errorRedirectPath" | "successRedirectPath",
  fallbackPath: string,
) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return fallbackPath;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("/siswa/tryout/")) {
    return fallbackPath;
  }

  return trimmedValue || fallbackPath;
}

export async function submitTryoutAnswersAction(formData: FormData) {
  const tryoutId = String(formData.get("tryoutId") ?? "").trim();
  const defaultDetailPath = `/siswa/tryout/${tryoutId}`;
  const errorRedirectPath = getRedirectPath(
    formData,
    "errorRedirectPath",
    defaultDetailPath,
  );
  const successRedirectPath = getRedirectPath(
    formData,
    "successRedirectPath",
    defaultDetailPath,
  );

  if (!tryoutId) {
    redirectWithMessage("/siswa", "error", "Tryout tidak valid untuk diproses.");
  }

  try {
    const session = await getCurrentSession();
    const studentUserId = session?.user.id;

    if (!studentUserId) {
      throw new Error("Sesi siswa tidak ditemukan. Silakan masuk kembali.");
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: {
        userId: studentUserId,
      },
      select: {
        id: true,
      },
    });

    if (!studentProfile) {
      throw new Error("Profil siswa belum tersedia.");
    }

    const tryout = await prisma.tryout.findFirst({
      where: {
        id: tryoutId,
        isPublished: true,
        subject: {
          isActive: true,
        },
        tryoutQuestions: {
          some: {
            question: {
              isActive: true,
            },
          },
        },
      },
      include: {
        tryoutQuestions: {
          where: {
            question: {
              isActive: true,
            },
          },
          orderBy: {
            orderNumber: "asc",
          },
          include: {
            question: {
              select: {
                correctOption: true,
                id: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!tryout || tryout.tryoutQuestions.length === 0) {
      throw new Error("Tryout ini belum siap dikerjakan.");
    }

    const submittedAnswers = tryout.tryoutQuestions.map((item) => {
      const rawValue = String(formData.get(`answer_${item.questionId}`) ?? "").trim();

      if (!answerOptions.has(rawValue as AnswerOption)) {
        throw new Error("Semua soal harus dijawab sebelum tryout dikirim.");
      }

      if (!item.question.isActive) {
        throw new Error("Terdapat soal tryout yang sudah tidak aktif.");
      }

      return {
        isCorrect: item.question.correctOption === rawValue,
        questionId: item.questionId,
        selectedOption: rawValue as AnswerOption,
      };
    });

    const totalQuestions = submittedAnswers.length;
    const correctAnswers = submittedAnswers.filter((item) => item.isCorrect).length;
    const score = Number(((correctAnswers / totalQuestions) * 100).toFixed(2));

    await prisma.$transaction(async (tx) => {
      const existingCompletedSession = await tx.tryoutSession.findFirst({
        where: {
          studentId: studentProfile.id,
          tryoutId,
          status: {
            in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
          },
        },
        select: {
          id: true,
        },
      });

      if (existingCompletedSession) {
        throw new Error("Tryout ini sudah pernah kamu kirim dan tidak bisa dikerjakan ulang.");
      }

      const existingDraftSession = await tx.tryoutSession.findFirst({
        where: {
          studentId: studentProfile.id,
          tryoutId,
          status: TryoutStatus.IN_PROGRESS,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
      });

      const activeSession =
        existingDraftSession ??
        (await tx.tryoutSession.create({
          data: {
            status: TryoutStatus.IN_PROGRESS,
            studentId: studentProfile.id,
            tryoutId,
          },
          select: {
            id: true,
          },
        }));

      await tx.tryoutAnswer.deleteMany({
        where: {
          tryoutSessionId: activeSession.id,
        },
      });

      await tx.tryoutAnswer.createMany({
        data: submittedAnswers.map((answer) => ({
          isCorrect: answer.isCorrect,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          tryoutSessionId: activeSession.id,
        })),
      });

      await tx.tryoutSession.update({
        where: {
          id: activeSession.id,
        },
        data: {
          correctAnswers,
          score,
          status: TryoutStatus.GRADED,
          submittedAt: new Date(),
          totalQuestions,
        },
      });
    });
  } catch (error) {
    redirectWithMessage(
      errorRedirectPath,
      "error",
      getErrorMessage(error),
    );
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/tryout");
  revalidatePath(`/siswa/tryout/${tryoutId}`);
  revalidatePath(`/siswa/tryout/${tryoutId}/kerjakan`);
  redirectWithMessage(
    successRedirectPath,
    "success",
    "Jawaban tryout berhasil dikirim dan dinilai.",
  );
}
