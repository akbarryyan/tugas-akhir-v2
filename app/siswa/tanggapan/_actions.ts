"use server";

import { LabelSource, LearningAspect, Prisma, TryoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getLikertFieldName,
  LIKERT_ITEMS,
  LIKERT_MAX_SCORE,
  LIKERT_MIN_SCORE,
} from "@/lib/feedback-likert";
import { predictSentiment } from "@/lib/nlp/sentiment-analysis";

const likertScoreSchema = z.coerce
  .number({ message: "Semua pernyataan penilaian wajib diisi." })
  .int("Nilai penilaian tidak valid.")
  .min(LIKERT_MIN_SCORE, `Nilai penilaian minimal ${LIKERT_MIN_SCORE}.`)
  .max(LIKERT_MAX_SCORE, `Nilai penilaian maksimal ${LIKERT_MAX_SCORE}.`);

const feedbackFormSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(10, "Tanggapan minimal 10 karakter.")
    .max(5000, "Tanggapan maksimal 5000 karakter."),
  ratings: z.array(
    z.object({
      itemNumber: z.number().int(),
      score: likertScoreSchema,
    }),
  ),
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
      return "Tanggapan untuk sesi tryout ini sudah ada. Muat ulang halaman lalu coba lagi.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menyimpan umpan balik pembelajaran.";
}

/**
 * Menentukan guru yang dinilai oleh tanggapan ini.
 *
 * Acuannya adalah penugasan mengajar pada kelas siswa, bukan pembuat tryout.
 * Satu paket soal bisa dipakai bersama oleh banyak kelas, sedangkan yang
 * mengajar tiap kelas belum tentu orang yang sama — memakai pembuat tryout akan
 * membebankan penilaian seluruh kelas kepada satu guru saja.
 *
 * Bila kelas tersebut belum punya penugasan untuk mata pelajaran ini, tanggapan
 * dibiarkan tanpa guru daripada dibebankan ke orang yang salah. Data seperti itu
 * tetap tersimpan dan dilaporkan sebagai belum terkait guru.
 */
async function resolveEvaluatedTeacherId(params: {
  className: string;
  subjectId: string;
}) {
  const assignment = await prisma.subjectTeacher.findUnique({
    where: {
      subjectId_className: {
        className: params.className,
        subjectId: params.subjectId,
      },
    },
    select: {
      teacherId: true,
    },
  });

  return assignment?.teacherId ?? null;
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
      comment: formData.get("comment"),
      ratings: LIKERT_ITEMS.map((item) => ({
        itemNumber: item.number,
        score: formData.get(getLikertFieldName(item.number)),
      })),
      tryoutSessionId,
    });

    tryoutSessionId = parsed.tryoutSessionId;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: {
        userId: studentUserId,
      },
      select: {
        className: true,
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

    const teacherId = await resolveEvaluatedTeacherId({
      className: studentProfile.className,
      subjectId: tryoutSession.tryout.subjectId,
    });

    const upsertedFeedback = await prisma.$transaction(async (tx) => {
      const feedback = await tx.feedback.upsert({
        where: {
          tryoutSessionId_aspect: {
            aspect: LearningAspect.UMUM,
            tryoutSessionId: tryoutSession.id,
          },
        },
        create: {
          aspect: LearningAspect.UMUM,
          comment: parsed.comment,
          studentId: studentProfile.id,
          subjectId: tryoutSession.tryout.subjectId,
          teacherId,
          tryoutSessionId: tryoutSession.id,
        },
        update: {
          comment: parsed.comment,
          teacherId,
        },
      });

      // Ditulis ulang seluruhnya supaya pengisian berikutnya tidak menyisakan
      // skor lama bila jumlah butir pernyataan berubah di kemudian hari.
      await tx.feedbackRating.deleteMany({
        where: {
          feedbackId: feedback.id,
        },
      });

      await tx.feedbackRating.createMany({
        data: parsed.ratings.map((rating) => ({
          feedbackId: feedback.id,
          itemNumber: rating.itemNumber,
          score: rating.score,
        })),
      });

      return feedback;
    });

    await analyzeFeedbackAndPersistSentiment({
      aspect: upsertedFeedback.aspect,
      comment: upsertedFeedback.comment,
      feedbackId: upsertedFeedback.id,
      subjectName: tryoutSession.tryout.subject.name,
    });

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
