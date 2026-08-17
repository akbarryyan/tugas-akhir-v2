import { LabelSource, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  needsManualReview,
  REVIEW_CONFIDENCE_THRESHOLD,
} from "@/lib/sentiment/confidence";
import {
  buildLikertSummaryFromTotals,
  countByLabel,
  getPercentages,
  getTotal,
  groupCountsBy,
  type LikertSummary,
  type SentimentBreakdownRow,
  type SentimentCounts,
} from "@/lib/sentiment/aggregate";

export const REPORT_PAGE_SIZE = 10;

export type FeedbackReportFilters = {
  className: string;
  page: number;
  subjectId: string;
  teacherId: string;
};

export type FeedbackReportRow = {
  id: string;
  comment: string;
  createdAt: Date;
  averageScore: number | null;
  finalLabel: string | null;
  labelSource: string | null;
  needsReview: boolean;
  confidence: number | null;
  className: string;
  studentName: string;
  subjectName: string;
  teacherName: string | null;
};

export type FeedbackReportData = {
  counts: SentimentCounts;
  percentages: { positif: number; negatif: number };
  respondentCount: number;
  pendingAnalysisCount: number;
  needsReviewCount: number;
  likert: LikertSummary;
  byClass: SentimentBreakdownRow[];
  bySubject: SentimentBreakdownRow[];
  byTeacher: SentimentBreakdownRow[];
  rows: FeedbackReportRow[];
  totalRows: number;
  totalPages: number;
  currentPage: number;
  options: {
    classNames: string[];
    subjects: Array<{ id: string; name: string }>;
    teachers: Array<{ id: string; name: string }>;
  };
};

export function parseReportFilters(searchParams?: {
  kelas?: string;
  mapel?: string;
  guru?: string;
  page?: string;
}): FeedbackReportFilters {
  const parsedPage = Number.parseInt(searchParams?.page ?? "1", 10);

  return {
    className: searchParams?.kelas?.trim() ?? "",
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    subjectId: searchParams?.mapel?.trim() ?? "",
    teacherId: searchParams?.guru?.trim() ?? "",
  };
}

function buildFeedbackWhere(
  filters: FeedbackReportFilters,
  lockedTeacherId: string | null,
): Prisma.FeedbackWhereInput {
  const teacherId = lockedTeacherId ?? (filters.teacherId || undefined);

  return {
    ...(teacherId ? { teacherId } : {}),
    ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters.className ? { student: { className: filters.className } } : {}),
  };
}

/**
 * Mengumpulkan laporan evaluasi pembelajaran: persentase sentimen, rata-rata
 * skala Likert, dan data mentah pendukungnya.
 *
 * Ketika `lockedTeacherId` diisi, seluruh query dikunci ke guru tersebut
 * sehingga seorang guru tidak dapat melihat umpan balik untuk guru lain
 * meskipun mengubah parameter URL secara manual.
 */
export async function loadFeedbackReport(params: {
  filters: FeedbackReportFilters;
  lockedTeacherId?: string | null;
}): Promise<FeedbackReportData> {
  const { filters } = params;
  const lockedTeacherId = params.lockedTeacherId ?? null;
  const feedbackWhere = buildFeedbackWhere(filters, lockedTeacherId);
  const analyzedWhere: Prisma.FeedbackWhereInput = {
    ...feedbackWhere,
    sentiment: { isNot: null },
  };

  const [
    sentimentRows,
    ratingTotals,
    respondentCount,
    pendingAnalysisCount,
    needsReviewCount,
    totalRows,
    rows,
    classNameGroups,
    subjects,
    teachers,
  ] = await Promise.all([
    prisma.sentimentAnalysis.findMany({
      where: { feedback: feedbackWhere },
      select: {
        finalLabel: true,
        feedback: {
          select: {
            student: { select: { className: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.feedbackRating.groupBy({
      by: ["itemNumber"],
      where: { feedback: feedbackWhere },
      _count: { _all: true },
      _sum: { score: true },
    }),
    prisma.feedback.count({ where: feedbackWhere }),
    prisma.feedback.count({ where: { ...feedbackWhere, sentiment: { is: null } } }),
    // Prediksi otomatis berkeyakinan rendah: perlu ditinjau guru sebelum
    // labelnya dipakai. Label yang sudah dikoreksi manual tidak ikut dihitung.
    prisma.sentimentAnalysis.count({
      where: {
        feedback: feedbackWhere,
        labelSource: LabelSource.AUTO,
        OR: [
          { autoConfidence: { lt: REVIEW_CONFIDENCE_THRESHOLD } },
          { autoConfidence: null },
        ],
      },
    }),
    prisma.feedback.count({ where: analyzedWhere }),
    prisma.feedback.findMany({
      where: analyzedWhere,
      select: {
        id: true,
        comment: true,
        createdAt: true,
        ratings: { select: { score: true } },
        student: {
          select: { className: true, user: { select: { name: true } } },
        },
        subject: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } } } },
        sentiment: {
          select: { autoConfidence: true, finalLabel: true, labelSource: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * REPORT_PAGE_SIZE,
      take: REPORT_PAGE_SIZE,
    }),
    prisma.studentProfile.groupBy({ by: ["className"], orderBy: { className: "asc" } }),
    prisma.subject.findMany({
      where: lockedTeacherId
        ? { subjectTeachers: { some: { teacherId: lockedTeacherId } } }
        : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    lockedTeacherId
      ? []
      : prisma.teacherProfile.findMany({
          select: { id: true, user: { select: { name: true } } },
          orderBy: { user: { name: "asc" } },
        }),
  ]);

  const counts = countByLabel(sentimentRows);

  return {
    byClass: groupCountsBy(sentimentRows, (row) => ({
      key: row.feedback.student.className,
      label: row.feedback.student.className,
    })),
    bySubject: groupCountsBy(sentimentRows, (row) => ({
      key: row.feedback.subject.id,
      label: row.feedback.subject.name,
    })),
    byTeacher: groupCountsBy(sentimentRows, (row) =>
      row.feedback.teacher
        ? { key: row.feedback.teacher.id, label: row.feedback.teacher.user.name }
        : null,
    ),
    counts,
    currentPage: filters.page,
    likert: buildLikertSummaryFromTotals(
      ratingTotals.map((total) => ({
        count: total._count._all,
        itemNumber: total.itemNumber,
        sum: total._sum.score ?? 0,
      })),
    ),
    options: {
      classNames: classNameGroups.map((group) => group.className),
      subjects,
      teachers: teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name })),
    },
    needsReviewCount,
    pendingAnalysisCount,
    percentages: getPercentages(counts),
    respondentCount,
    rows: rows.map((row) => ({
      averageScore:
        row.ratings.length > 0
          ? row.ratings.reduce((sum, rating) => sum + rating.score, 0) / row.ratings.length
          : null,
      className: row.student.className,
      comment: row.comment,
      confidence: row.sentiment?.autoConfidence
        ? Number(row.sentiment.autoConfidence)
        : null,
      createdAt: row.createdAt,
      finalLabel: row.sentiment?.finalLabel ?? null,
      id: row.id,
      labelSource: row.sentiment?.labelSource ?? null,
      needsReview: needsManualReview(
        row.sentiment
          ? {
              autoConfidence: row.sentiment.autoConfidence
                ? Number(row.sentiment.autoConfidence)
                : null,
              labelSource: row.sentiment.labelSource,
            }
          : null,
      ),
      studentName: row.student.user.name,
      subjectName: row.subject.name,
      teacherName: row.teacher?.user.name ?? null,
    })),
    totalPages: Math.max(1, Math.ceil(totalRows / REPORT_PAGE_SIZE)),
    totalRows,
  };
}

export function getReportSummaryLine(data: FeedbackReportData) {
  const total = getTotal(data.counts);

  return total === 0
    ? "Belum ada tanggapan yang dianalisis untuk filter ini."
    : `${total} tanggapan dianalisis • ${data.percentages.positif}% positif • ${data.percentages.negatif}% negatif`;
}
