"use server";

import { LabelSource, Prisma, Role, SentimentLabel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const sentimentReviewSchema = z.object({
  manualLabel: z.enum([SentimentLabel.POSITIF, SentimentLabel.NEGATIF, SentimentLabel.NETRAL]).optional(),
  redirectTo: z.string().trim().min(1).default("/admin/feedback"),
  reviewNotes: z.string().trim().max(500, "Catatan review maksimal 500 karakter.").optional(),
  sentimentId: z.string().trim().min(1, "Analisis sentimen tidak valid."),
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
    return error.issues[0]?.message ?? "Data review belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return "Perubahan review tidak dapat disimpan saat ini.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menyimpan tinjauan sentimen.";
}

export async function reviewSentimentAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/feedback").trim() || "/admin/feedback";

  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      throw new Error("Sesi pengguna tidak ditemukan. Silakan masuk kembali.");
    }

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.GURU) {
      throw new Error("Anda tidak memiliki akses untuk meninjau analisis sentimen.");
    }

    const rawManualLabel = String(formData.get("manualLabel") ?? "").trim().toUpperCase();
    const parsed = sentimentReviewSchema.parse({
      manualLabel: rawManualLabel
        ? rawManualLabel
        : undefined,
      redirectTo,
      reviewNotes: formData.get("reviewNotes"),
      sentimentId: formData.get("sentimentId"),
    });

    const sentiment = await prisma.sentimentAnalysis.findUnique({
      where: {
        id: parsed.sentimentId,
      },
      select: {
        id: true,
        autoLabel: true,
        feedbackId: true,
        feedback: {
          select: {
            aspect: true,
            comment: true,
            subject: {
              select: {
                name: true,
                subjectTeachers: {
                  select: {
                    teacher: {
                      select: {
                        userId: true,
                      },
                    },
                  },
                },
              },
            },
            tryoutSession: {
              select: {
                tryout: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sentiment) {
      throw new Error("Data analisis sentimen tidak ditemukan.");
    }

    if (session.user.role === Role.GURU) {
      const isAuthorizedTeacher = sentiment.feedback.subject.subjectTeachers.some(
        (assignment) => assignment.teacher.userId === session.user.id,
      );

      if (!isAuthorizedTeacher) {
        throw new Error("Anda hanya dapat meninjau umpan balik pada mata pelajaran yang diampu.");
      }
    }

    const reviewNotes = parsed.reviewNotes?.trim() ? parsed.reviewNotes.trim() : null;
    const hasManualOverride = Boolean(parsed.manualLabel);

    await prisma.sentimentAnalysis.update({
      where: {
        id: sentiment.id,
      },
      data: hasManualOverride
        ? {
            finalLabel: parsed.manualLabel!,
            labelSource: LabelSource.MANUAL,
            manualLabel: parsed.manualLabel!,
            reviewNotes,
            reviewedAt: new Date(),
            reviewedByUserId: session.user.id,
          }
        : {
            finalLabel: sentiment.autoLabel,
            labelSource: LabelSource.AUTO,
            manualLabel: null,
            reviewNotes: null,
            reviewedAt: null,
            reviewedByUserId: null,
          },
    });

    if (session.user.role === Role.ADMIN) {
      await recordAdminActivity({
        action: "UPDATE",
        details: hasManualOverride
          ? `Label manual diubah menjadi ${parsed.manualLabel}. Catatan: ${reviewNotes ?? "-"}`
          : "Review manual direset ke label otomatis.",
        entityLabel: `${sentiment.feedback.subject.name} • ${sentiment.feedback.aspect}`,
        entityType: "MAPEL",
        message: hasManualOverride
          ? `Admin meninjau ulang sentimen umpan balik pembelajaran untuk ${sentiment.feedback.subject.name}.`
          : `Admin mengembalikan sentimen umpan balik pembelajaran ke hasil otomatis untuk ${sentiment.feedback.subject.name}.`,
      });
    }

    revalidatePath("/admin/feedback");
    revalidatePath("/admin");
    revalidatePath("/guru/feedback");
    revalidatePath("/guru");
    revalidatePath("/siswa/tanggapan");

    redirectWithMessage(
      parsed.redirectTo,
      "success",
      hasManualOverride
        ? "Tinjauan manual sentimen berhasil disimpan."
        : "Label sentimen berhasil dikembalikan ke hasil otomatis.",
    );
  } catch (error) {
    redirectWithMessage(redirectTo, "error", getErrorMessage(error));
  }
}
