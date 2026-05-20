"use server";

import { LabelSource, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAdminActivity } from "@/lib/admin/activity";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { predictSentiment } from "@/lib/nlp/sentiment-analysis";

const reanalyzeSchema = z.object({
  query: z.string().trim().optional(),
  redirectTo: z.string().trim().min(1).default("/admin/feedback"),
});

const reanalyzeSingleSchema = z.object({
  feedbackId: z.string().trim().min(1, "Data umpan balik tidak valid."),
  redirectTo: z.string().trim().min(1).default("/admin/feedback"),
});

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
) {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);

  params.set("message", message);
  params.set("type", type);

  redirect(`${pathname}?${params.toString()}`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Permintaan reanalyze belum valid.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return "Data sentimen tidak dapat diperbarui saat ini.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat menjalankan reanalyze sentimen.";
}

function buildFeedbackQueryFilter(query: string) {
  if (!query) {
    return {};
  }

  return {
    OR: [
      {
        comment: {
          contains: query,
        },
      },
      {
        subject: {
          name: {
            contains: query,
          },
        },
      },
      {
        student: {
          user: {
            name: {
              contains: query,
            },
          },
        },
      },
      {
        tryoutSession: {
          tryout: {
            title: {
              contains: query,
            },
          },
        },
      },
    ],
  };
}

export async function reanalyzeVisibleSentimentsAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/feedback").trim() || "/admin/feedback";

  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      throw new Error("Sesi pengguna tidak ditemukan. Silakan masuk kembali.");
    }

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.GURU) {
      throw new Error("Anda tidak memiliki akses untuk menjalankan reanalyze sentimen.");
    }

    const parsed = reanalyzeSchema.parse({
      query: formData.get("query"),
      redirectTo,
    });
    const query = parsed.query?.trim() ?? "";

    const teacherProfile =
      session.user.role === Role.GURU
        ? await prisma.teacherProfile.findUnique({
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
            },
          })
        : null;

    if (session.user.role === Role.GURU && !teacherProfile) {
      throw new Error("Profil guru tidak ditemukan.");
    }

    const feedbacks = await prisma.feedback.findMany({
      where: {
        sentiment: {
          isNot: null,
        },
        ...(session.user.role === Role.GURU
          ? {
              subject: {
                subjectTeachers: {
                  some: {
                    teacherId: teacherProfile!.id,
                  },
                },
              },
            }
          : {}),
        ...buildFeedbackQueryFilter(query),
      },
      select: {
        id: true,
        aspect: true,
        comment: true,
        subject: {
          select: {
            name: true,
          },
        },
        sentiment: {
          select: {
            id: true,
            labelSource: true,
            manualLabel: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    });

    if (feedbacks.length === 0) {
      throw new Error("Tidak ada data sentimen yang bisa diprediksi ulang pada filter ini.");
    }

    let updatedCount = 0;

    for (const feedback of feedbacks) {
      if (!feedback.sentiment) {
        continue;
      }

      const prediction = await predictSentiment({
        aspect: feedback.aspect,
        comment: feedback.comment,
        subject: feedback.subject.name,
      });

      await prisma.sentimentAnalysis.update({
        where: {
          id: feedback.sentiment.id,
        },
        data: feedback.sentiment.labelSource === LabelSource.MANUAL
          ? {
              autoConfidence: prediction.autoConfidence,
              autoLabel: prediction.autoLabel,
              autoMethod: prediction.autoMethod,
              modelVersion: prediction.modelVersion,
              preprocessedText: prediction.preprocessedText,
            }
          : {
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

      updatedCount += 1;
    }

    if (session.user.role === Role.ADMIN) {
      await recordAdminActivity({
        action: "UPDATE",
        details: `Reanalyze massal pada ${updatedCount} data sentimen.`,
        entityLabel: "Review Sentimen",
        entityType: "MAPEL",
        message: `Admin menjalankan reanalyze sentimen untuk umpan balik pembelajaran${query ? ` dengan filter "${query}"` : ""}.`,
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
      `${updatedCount} data sentimen berhasil diprediksi ulang.`,
    );
  } catch (error) {
    redirectWithMessage(redirectTo, "error", getErrorMessage(error));
  }
}

export async function reanalyzeSingleSentimentAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/feedback").trim() || "/admin/feedback";

  try {
    const session = await getCurrentSession();

    if (!session?.user) {
      throw new Error("Sesi pengguna tidak ditemukan. Silakan masuk kembali.");
    }

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.GURU) {
      throw new Error("Anda tidak memiliki akses untuk menjalankan reanalyze sentimen.");
    }

    const parsed = reanalyzeSingleSchema.parse({
      feedbackId: formData.get("feedbackId"),
      redirectTo,
    });

    const teacherProfile =
      session.user.role === Role.GURU
        ? await prisma.teacherProfile.findUnique({
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
            },
          })
        : null;

    if (session.user.role === Role.GURU && !teacherProfile) {
      throw new Error("Profil guru tidak ditemukan.");
    }

    const feedback = await prisma.feedback.findFirst({
      where: {
        id: parsed.feedbackId,
        sentiment: {
          isNot: null,
        },
        ...(session.user.role === Role.GURU
          ? {
              subject: {
                subjectTeachers: {
                  some: {
                    teacherId: teacherProfile!.id,
                  },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        aspect: true,
        comment: true,
        subject: {
          select: {
            name: true,
          },
        },
        sentiment: {
          select: {
            id: true,
            labelSource: true,
          },
        },
      },
    });

    if (!feedback?.sentiment) {
      throw new Error("Data sentimen yang dipilih tidak ditemukan atau tidak bisa diakses.");
    }

    const prediction = await predictSentiment({
      aspect: feedback.aspect,
      comment: feedback.comment,
      subject: feedback.subject.name,
    });

    await prisma.sentimentAnalysis.update({
      where: {
        id: feedback.sentiment.id,
      },
      data:
        feedback.sentiment.labelSource === LabelSource.MANUAL
          ? {
              autoConfidence: prediction.autoConfidence,
              autoLabel: prediction.autoLabel,
              autoMethod: prediction.autoMethod,
              modelVersion: prediction.modelVersion,
              preprocessedText: prediction.preprocessedText,
            }
          : {
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

    if (session.user.role === Role.ADMIN) {
      await recordAdminActivity({
        action: "UPDATE",
        details: `Reanalyze satu data sentimen pada feedback ${feedback.id}.`,
        entityLabel: "Review Sentimen",
        entityType: "MAPEL",
        message: `Admin menjalankan reanalyze sentimen untuk satu umpan balik pembelajaran.`,
      });
    }

    revalidatePath("/admin/feedback");
    revalidatePath("/admin");
    revalidatePath("/guru/feedback");
    revalidatePath("/guru");
    revalidatePath("/siswa/tanggapan");

    redirectWithMessage(parsed.redirectTo, "success", "Data sentimen berhasil diprediksi ulang.");
  } catch (error) {
    redirectWithMessage(redirectTo, "error", getErrorMessage(error));
  }
}
