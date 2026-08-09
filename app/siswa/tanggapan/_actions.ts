"use server";

import { LabelSource, LearningAspect, Prisma, TryoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { predictSentiment } from "@/lib/nlp/sentiment-analysis";
import {
  REQUIRED_FEEDBACK_ASPECTS,
} from "@/lib/student-feedback";

const feedbackFormSchema = z.object({
  materi: z.string().trim().min(5, "Tanggapan aspek materi minimal 5 karakter."),
  penyampaian: z
    .string()
    .trim()
    .min(5, "Tanggapan aspek penyampaian minimal 5 karakter."),
  soal: z.string().trim().min(5, "Tanggapan aspek soal minimal 5 karakter."),
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

  const connector = path.includes("?") ? "&" : "?";
  redirect(`${path}${connector}${params.toString()}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Form umpan balik pembelajaran belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Umpan balik untuk aspek yang sama sudah ada. Muat ulang halaman lalu coba lagi.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menyimpan umpan balik pembelajaran.";
}

async function analyzeFeedbackAndPersistSentiment(params: {
  comment: string;
  feedbackId: string;
  aspect: LearningAspect;
  subjectName: string;
}) {
  try {
    const prediction = await predictSentiment({
      aspect: params.aspect,
      comment: params.comment,
      subject: params.subjectName,
    });

    await prisma.sentimentAnalysis.upsert({
      where: {
        feedbackId: params.feedbackId,
      },
      create: {
        autoConfidence: prediction.autoConfidence,
        autoLabel: prediction.autoLabel,
        autoMethod: prediction.autoMethod,
        feedbackId: params.feedbackId,
        finalLabel: prediction.autoLabel,
        labelSource: LabelSource.AUTO,
        modelVersion: prediction.modelVersion,
        preprocessedText: prediction.preprocessedText,
      },
      update: {
        autoConfidence: prediction.autoConfidence,
        autoLabel: prediction.autoLabel,
        autoMethod: prediction.autoMethod,
        finalLabel: prediction.autoLabel,
        labelSource: LabelSource.AUTO,
        manualLabel: null,
        modelVersion: prediction.modelVersion,
        preprocessedText: prediction.preprocessedText,
        reviewNotes: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });
  } catch (error) {
    console.error("Sentiment analysis failed for feedback", params.feedbackId, error);
  }
}

export async function submitStudentFeedbackAction(formData: FormData) {
  let tryoutSessionId = String(formData.get("tryoutSessionId") ?? "").trim();
  let successData: { sessionId: string; subjectName: string; tryoutId: string } | null = null;

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
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!tryoutSession) {
      throw new Error("Sesi tryout untuk pengisian umpan balik tidak ditemukan.");
    }

    const commentsByAspect: Record<LearningAspect, string> = {
      [LearningAspect.MATERI]: parsed.materi,
      [LearningAspect.PENYAMPAIAN]: parsed.penyampaian,
      [LearningAspect.SOAL]: parsed.soal,
    };

    const upsertedFeedbacks = await prisma.$transaction(async (tx) => {
      const feedbacks = [];

      for (const aspect of REQUIRED_FEEDBACK_ASPECTS) {
        const feedback = await tx.feedback.upsert({
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

        feedbacks.push(feedback);
      }

      return feedbacks;
    });

    await Promise.all(
      upsertedFeedbacks.map((feedback) =>
        analyzeFeedbackAndPersistSentiment({
          aspect: feedback.aspect,
          comment: feedback.comment,
          feedbackId: feedback.id,
          subjectName: tryoutSession.tryout.subject.name,
        }),
      ),
    );

    successData = {
      sessionId: tryoutSession.id,
      subjectName: tryoutSession.tryout.subject.name,
      tryoutId: tryoutSession.tryout.id,
    };
  } catch (error) {
    const fallbackPath = tryoutSessionId
      ? `/siswa/tanggapan?session=${tryoutSessionId}`
      : "/siswa/tanggapan";

    redirectWithMessage(fallbackPath, "error", getErrorMessage(error));
  }

  // redirect() dipanggil di luar try/catch karena di Next.js App Router,
  // redirect() melempar error internal NEXT_REDIRECT yang akan tertangkap catch jika dipanggil di dalam try.
  revalidatePath("/siswa");
  revalidatePath("/siswa/tryout");
  revalidatePath("/siswa/hasil");
  revalidatePath("/siswa/progres");
  revalidatePath("/siswa/tanggapan");
  revalidatePath(`/siswa/tryout/${successData!.tryoutId}`);

  redirectWithMessage(
    `/siswa/tanggapan?session=${successData!.sessionId}`,
    "success",
    `Umpan balik pembelajaran untuk ${successData!.subjectName} berhasil disimpan.`,
  );
}
