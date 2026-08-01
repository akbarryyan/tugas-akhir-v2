import Link from "next/link";
import { LabelSource, LearningAspect, Role, SentimentLabel } from "@prisma/client";

import { PageIntro, SearchToolbar, SectionCard, StatusAlert } from "@/app/admin/_components";
import { SentimentDistributionSection, type SentimentChartData } from "@/app/admin/_sentiment-charts";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  reanalyzeSingleSentimentAction,
  reanalyzeVisibleSentimentsAction,
} from "@/lib/sentiment/reanalyze-actions";
import { reviewSentimentAction } from "@/lib/sentiment/review-actions";
import { feedbackAspectLabelMap } from "@/lib/student-feedback";

type AdminFeedbackPageProps = {
  searchParams?: Promise<{
    message?: string;
    q?: string;
    type?: string;
  }>;
};

export default async function AdminFeedbackPage({
  searchParams,
}: AdminFeedbackPageProps) {
  await requireRole([Role.ADMIN]);
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const [feedbacks, allSentimentStats] = await Promise.all([
    prisma.feedback.findMany({
    where: query
      ? {
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
        }
      : undefined,
    select: {
      id: true,
      aspect: true,
      comment: true,
      createdAt: true,
      student: {
        select: {
          className: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      subject: {
        select: {
          name: true,
        },
      },
      tryoutSession: {
        select: {
          tryout: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      sentiment: {
        select: {
          id: true,
          autoConfidence: true,
          autoLabel: true,
          autoMethod: true,
          finalLabel: true,
          labelSource: true,
          manualLabel: true,
          reviewNotes: true,
          reviewedAt: true,
          reviewedByUser: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    take: 40,
  }),
    prisma.sentimentAnalysis.findMany({
      select: {
        finalLabel: true,
        feedback: {
          select: {
            aspect: true,
            subject: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
  ]);

  const reviewableFeedbacks = feedbacks.filter((feedback) => feedback.sentiment);
  const manualCount = reviewableFeedbacks.filter(
    (feedback) => feedback.sentiment?.labelSource === LabelSource.MANUAL,
  ).length;

  const chartData = buildSentimentChartData(allSentimentStats);

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Review Sentimen"
        title="Tinjau Umpan Balik Siswa"
        description="Periksa hasil label otomatis pada umpan balik siswa terhadap proses pembelajaran, lalu koreksi hanya bila diperlukan. Label final akan dipakai untuk dashboard analitik dan dataset training berikutnya."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Umpan Balik Teranalisis"
          value={reviewableFeedbacks.length}
          tone="blue"
          helper="Umpan balik siswa yang sudah memiliki hasil auto-label dan siap ditinjau."
        />
        <SummaryCard
          label="Review Manual"
          value={manualCount}
          tone="emerald"
          helper="Jumlah umpan balik yang final label-nya sudah dikoreksi manual."
        />
        <SummaryCard
          label="Masih Otomatis"
          value={Math.max(0, reviewableFeedbacks.length - manualCount)}
          tone="amber"
          helper="Umpan balik yang masih memakai label final dari sistem otomatis."
        />
      </section>

      <section className="rounded-[1.6rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-5">
          <p className="text-sm font-semibold text-slate-900">Distribusi Sentimen</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Visualisasi sebaran label sentimen final dari seluruh umpan balik yang sudah dianalisis, dikelompokkan per aspek dan mata pelajaran.
          </p>
        </div>
        <SentimentDistributionSection data={chartData} />
      </section>

      <SectionCard
        title="Daftar Umpan Balik"
        description="Gunakan pencarian untuk mempersempit data berdasarkan siswa, sesi tryout, mata pelajaran, atau isi komentar pembelajaran."
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <SearchToolbar
              query={query}
              placeholder="Cari siswa, tryout, mapel, atau isi umpan balik"
              resetHref="/admin/feedback"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form action={reanalyzeVisibleSentimentsAction}>
              <input type="hidden" name="query" value={query} />
              <input
                type="hidden"
                name="redirectTo"
                value={query ? `/admin/feedback?q=${encodeURIComponent(query)}` : "/admin/feedback"}
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={reviewableFeedbacks.length === 0}
              >
                Reanalyze Sentimen
              </button>
            </form>
            <Link
              href={query ? `/admin/feedback/export?q=${encodeURIComponent(query)}` : "/admin/feedback/export"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
            >
              Export Dataset Training
            </Link>
          </div>
        </div>

        <p className="mt-3 text-xs leading-6 text-slate-500">
          Reanalyze akan memperbarui hasil auto-label pada data yang tampil. Final label manual tetap
          dipertahankan agar koreksi reviewer tidak tertimpa.
        </p>

        {reviewableFeedbacks.length === 0 ? (
          <div className="mt-5 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm leading-7 text-slate-500">
            Belum ada umpan balik pembelajaran yang siap ditinjau.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {reviewableFeedbacks.map((feedback) => (
              <ReviewFeedbackCard
                key={feedback.id}
                feedback={feedback}
                redirectTo={query ? `/admin/feedback?q=${encodeURIComponent(query)}` : "/admin/feedback"}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

type ReviewFeedbackCardProps = {
  feedback: {
    id: string;
    aspect: LearningAspect;
    comment: string;
    createdAt: Date;
    student: {
      className: string;
      user: {
        name: string;
      };
    };
    subject: {
      name: string;
    };
    tryoutSession: {
      tryout: {
        id: string;
        title: string;
      };
    };
    sentiment: {
      id: string;
      autoConfidence: PrismaDecimalLike | null;
      autoLabel: SentimentLabel;
      autoMethod: string;
      finalLabel: SentimentLabel;
      labelSource: LabelSource;
      manualLabel: SentimentLabel | null;
      reviewNotes: string | null;
      reviewedAt: Date | null;
      reviewedByUser: {
        name: string | null;
        role: Role;
      } | null;
    } | null;
  };
  redirectTo: string;
};

type PrismaDecimalLike = { toString(): string } | number;

function ReviewFeedbackCard({ feedback, redirectTo }: ReviewFeedbackCardProps) {
  if (!feedback.sentiment) {
    return null;
  }

  const autoConfidence = Number(feedback.sentiment.autoConfidence ?? 0);

  return (
    <article className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="slate">{feedback.subject.name}</Pill>
            <Pill tone="blue">{feedbackAspectLabelMap[feedback.aspect]}</Pill>
            <Pill tone="emerald">{sentimentLabelMap[feedback.sentiment.autoLabel]} otomatis</Pill>
            <Pill tone={feedback.sentiment.labelSource === LabelSource.MANUAL ? "amber" : "violet"}>
              {feedback.sentiment.labelSource === LabelSource.MANUAL ? "Final manual" : "Final otomatis"}
            </Pill>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              {feedback.tryoutSession.tryout.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {feedback.student.user.name} • {feedback.student.className} • {formatDateTime(feedback.createdAt)}
            </p>
          </div>
        </div>
        <Link
          href="/admin/tryout"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Buka Monitoring
        </Link>
      </div>

      <p className="mt-4 rounded-[1rem] border border-white bg-white px-4 py-4 text-sm leading-7 text-slate-700">
        {feedback.comment}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricPanel
          label="Label Otomatis"
          value={sentimentLabelMap[feedback.sentiment.autoLabel]}
          helper={`${feedback.sentiment.autoMethod} • confidence ${autoConfidence.toFixed(2)}`}
        />
        <MetricPanel
          label="Label Final"
          value={sentimentLabelMap[feedback.sentiment.finalLabel]}
          helper={
            feedback.sentiment.labelSource === LabelSource.MANUAL
              ? `Ditinjau oleh ${feedback.sentiment.reviewedByUser?.name ?? "Reviewer"}`
              : "Masih mengikuti hasil sistem otomatis"
          }
        />
        <MetricPanel
          label="Catatan Review"
          value={feedback.sentiment.reviewNotes?.trim() || "Belum ada"}
          helper={
            feedback.sentiment.reviewedAt
              ? `Diperbarui ${formatDateTime(feedback.sentiment.reviewedAt)}`
              : "Belum pernah ditinjau manual"
          }
        />
      </div>

      <div className="mt-5 grid gap-4 rounded-[1rem] border border-slate-200 bg-white p-4">
        <form action={reviewSentimentAction} className="grid gap-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input type="hidden" name="sentimentId" value={feedback.sentiment.id} />

          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Override Label Manual</span>
              <select
                name="manualLabel"
                defaultValue={feedback.sentiment.manualLabel ?? ""}
                className="h-11 rounded-[0.9rem] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Gunakan label otomatis</option>
                <option value={SentimentLabel.POSITIF}>Positif</option>
                <option value={SentimentLabel.NEGATIF}>Negatif</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-900">Catatan Reviewer</span>
              <textarea
                name="reviewNotes"
                defaultValue={feedback.sentiment.reviewNotes ?? ""}
                rows={3}
                placeholder="Opsional, misalnya: komentar bernada campuran namun secara keseluruhan cenderung negatif."
                className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Simpan Tinjauan
            </button>
            <span className="text-sm text-slate-500">
              Pilih kosong untuk mengembalikan label final ke hasil otomatis.
            </span>
          </div>
        </form>

        <form action={reanalyzeSingleSentimentAction} className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <input type="hidden" name="feedbackId" value={feedback.id} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-full border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
          >
            Reanalyze Item Ini
          </button>
          <span className="text-sm text-slate-500">
            Memperbarui hasil auto-label untuk komentar ini tanpa menimpa final label manual.
          </span>
        </form>
      </div>
    </article>
  );
}

function SummaryCard({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: "amber" | "blue" | "emerald";
  value: number;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-[1rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>Ringkasan</span>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function MetricPanel({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "blue" | "emerald" | "slate" | "violet";
}) {
  const className =
    tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : tone === "violet"
          ? "bg-violet-100 text-violet-700"
          : tone === "slate"
            ? "bg-slate-200 text-slate-700"
            : "bg-blue-100 text-blue-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

const sentimentLabelMap: Record<SentimentLabel, string> = {
  [SentimentLabel.POSITIF]: "Positif",
  [SentimentLabel.NEGATIF]: "Negatif",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const aspectDisplayMap: Record<LearningAspect, string> = {
  [LearningAspect.MATERI]: "Materi",
  [LearningAspect.PENYAMPAIAN]: "Penyampaian",
  [LearningAspect.SOAL]: "Evaluasi Soal",
};

type SentimentStatRow = {
  finalLabel: SentimentLabel;
  feedback: {
    aspect: LearningAspect;
    subject: { id: string; name: string };
  };
};

function buildSentimentChartData(rows: SentimentStatRow[]): SentimentChartData {
  const overall = { positif: 0, negatif: 0 };
  const aspectMap = new Map<LearningAspect, { positif: number; negatif: number }>();
  const subjectMap = new Map<string, { name: string; positif: number; negatif: number }>();

  for (const row of rows) {
    const label = row.finalLabel;
    const aspect = row.feedback.aspect;
    const subjectId = row.feedback.subject.id;
    const subjectName = row.feedback.subject.name;

    if (label === SentimentLabel.POSITIF) overall.positif++;
    else overall.negatif++;

    if (!aspectMap.has(aspect)) aspectMap.set(aspect, { positif: 0, negatif: 0 });
    const ac = aspectMap.get(aspect)!;
    if (label === SentimentLabel.POSITIF) ac.positif++;
    else ac.negatif++;

    if (!subjectMap.has(subjectId)) subjectMap.set(subjectId, { name: subjectName, positif: 0, negatif: 0 });
    const sc = subjectMap.get(subjectId)!;
    if (label === SentimentLabel.POSITIF) sc.positif++;
    else sc.negatif++;
  }

  const byAspect = ([LearningAspect.MATERI, LearningAspect.PENYAMPAIAN, LearningAspect.SOAL] as const).map(
    (aspect) => {
      const counts = aspectMap.get(aspect) ?? { positif: 0, negatif: 0 };
      return { label: aspectDisplayMap[aspect], counts };
    },
  );

  const bySubject = Array.from(subjectMap.values())
    .sort((a, b) => (b.positif + b.negatif) - (a.positif + a.negatif))
    .slice(0, 8)
    .map(({ name, positif, negatif }) => ({ label: name, counts: { positif, negatif } }));

  return { overall, byAspect, bySubject };
}

