"use server";

import { LearningAspect, Prisma, TryoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  REQUIRED_FEEDBACK_ASPECTS,
} from "@/lib/student-feedback";

const feedbackFormSchema = z.object({
  materi: z.string().trim().min(12, "Tanggapan aspek materi minimal 12 karakter."),
  penyampaian: z
    .string()
    .trim()
    .min(12, "Tanggapan aspek penyampaian minimal 12 karakter."),
  soal: z.string().trim().min(12, "Tanggapan aspek soal minimal 12 karakter."),
  tryoutSessionId: z.string().trim().min(1, "Sesi tryout tidak valid."),
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
    return error.issues[0]?.message ?? "Form tanggapan belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Tanggapan untuk aspek yang sama sudah ada. Muat ulang halaman lalu coba lagi.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menyimpan tanggapan.";
}

export async function submitStudentFeedbackAction(formData: FormData) {
  let tryoutSessionId = String(formData.get("tryoutSessionId") ?? "").trim();

  try {
    const session = await getCurrentSession();
    const studentUserId = session?.user.id;

    if (!studentUserId) {
      throw new Error("Sesi siswa tidak ditemukan. Silakan masuk kembali.");
    }

    const parsed = feedbackFormSchema.parse({
      materi: formData.get("materi"),
      penyampaian: formData.get("penyampaian"),
      soal: formData.get("soal"),
      tryoutSessionId,
    });

    tryoutSessionId = parsed.tryoutSessionId;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: {
        userId: studentUserId,
      },
      select: {
        id: true,
      },
    });

    if (!studentProfile) {
      throw new Error("Profil siswa belum ditemukan.");
    }

    const tryoutSession = await prisma.tryoutSession.findFirst({
      where: {
        id: parsed.tryoutSessionId,
        studentId: studentProfile.id,
        status: {
          in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
        },
      },
      select: {
        id: true,
        tryout: {
          select: {
            id: true,
            title: true,
            subjectId: true,
          },
        },
      },
    });

    if (!tryoutSession) {
      throw new Error("Sesi tryout untuk tanggapan tidak ditemukan.");
    }

    const commentsByAspect: Record<LearningAspect, string> = {
      [LearningAspect.MATERI]: parsed.materi,
      [LearningAspect.PENYAMPAIAN]: parsed.penyampaian,
      [LearningAspect.SOAL]: parsed.soal,
    };

    await prisma.$transaction(async (tx) => {
      for (const aspect of REQUIRED_FEEDBACK_ASPECTS) {
        await tx.feedback.upsert({
          where: {
            tryoutSessionId_aspect: {
              aspect,
              tryoutSessionId: tryoutSession.id,
            },
          },
          create: {
            aspect,
            comment: commentsByAspect[aspect],
            studentId: studentProfile.id,
            subjectId: tryoutSession.tryout.subjectId,
            tryoutSessionId: tryoutSession.id,
          },
          update: {
            comment: commentsByAspect[aspect],
          },
        });
      }
    });

    revalidatePath("/siswa");
    revalidatePath("/siswa/tryout");
    revalidatePath("/siswa/hasil");
    revalidatePath("/siswa/progres");
    revalidatePath("/siswa/tanggapan");
    revalidatePath(`/siswa/tryout/${tryoutSession.tryout.id}`);

    redirectWithMessage(
      `/siswa/tanggapan?session=${tryoutSession.id}`,
      "success",
      `Tanggapan untuk tryout ${tryoutSession.tryout.title} berhasil disimpan.`,
    );
  } catch (error) {
    const fallbackPath = tryoutSessionId
      ? `/siswa/tanggapan?session=${tryoutSessionId}`
      : "/siswa/tanggapan";

    redirectWithMessage(fallbackPath, "error", getErrorMessage(error));
  }
}
