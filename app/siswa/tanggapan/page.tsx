import Link from "next/link";
import { LearningAspect, SentimentLabel, TryoutStatus } from "@prisma/client";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function SiswaTanggapanPage() {
  const session = await getCurrentSession();
  const studentUserId = session?.user.id ?? "";

  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: studentUserId,
    },
    select: {
      id: true,
    },
  });

  const [pendingSessions, recentFeedbacks] = studentProfile
    ? await Promise.all([
        prisma.tryoutSession.findMany({
          where: {
            studentId: studentProfile.id,
            status: {
              in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
            },
            feedbacks: {
              none: {},
            },
            tryout: {
              isPublished: true,
              subject: {
                isActive: true,
              },
            },
          },
          select: {
            id: true,
            submittedAt: true,
            tryout: {
              select: {
                id: true,
                title: true,
                subject: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            {
              submittedAt: "desc",
            },
            {
              updatedAt: "desc",
            },
          ],
        }),
        prisma.feedback.findMany({
          where: {
            studentId: studentProfile.id,
          },
          select: {
            id: true,
            aspect: true,
            comment: true,
            createdAt: true,
            tryoutSessionId: true,
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
                label: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 9,
        }),
      ])
    : [[], []];

  const uniquePendingTryouts = new Map<string, (typeof pendingSessions)[number]>();

  for (const pendingSession of pendingSessions) {
    if (!uniquePendingTryouts.has(pendingSession.tryout.id)) {
      uniquePendingTryouts.set(pendingSession.tryout.id, pendingSession);
    }
  }

  const pendingTryoutItems = Array.from(uniquePendingTryouts.values());
  const sentimentReadyCount = recentFeedbacks.filter((item) => item.sentiment).length;

  return (
    <div className="space-y-5">
      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Aktivitas Belajar
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Tanggapan
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Kelola tanggapan belajar setelah tryout selesai dan lihat ringkasan umpan balik yang
            sudah pernah kamu kirim.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <FeedbackSummaryCard
          label="Menunggu Tanggapan"
          helper="Tryout yang sudah selesai tetapi belum kamu beri umpan balik."
          tone="orange"
          value={String(pendingTryoutItems.length)}
        />
        <FeedbackSummaryCard
          label="Riwayat Tanggapan"
          helper="Jumlah tanggapan yang sudah tersimpan pada sistem."
          tone="blue"
          value={String(recentFeedbacks.length)}
        />
        <FeedbackSummaryCard
          label="Analisis Sentimen"
          helper="Tanggapan yang sudah punya hasil analisis sentimen."
          tone="emerald"
          value={String(sentimentReadyCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Tryout yang Menunggu Tanggapan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lengkapi tanggapan setelah tryout agar evaluasi pembelajaranmu lebih utuh.
              </p>
            </div>
            <Link
              href="/siswa/hasil"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Lihat Hasil
            </Link>
          </div>

          {pendingTryoutItems.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
              Semua tryout yang selesai sudah memiliki tanggapan.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {pendingTryoutItems.map((sessionItem) => (
                <PendingFeedbackTryoutCard
                  key={sessionItem.id}
                  subjectName={sessionItem.tryout.subject.name}
                  submittedAt={sessionItem.submittedAt}
                  title={sessionItem.tryout.title}
                  tryoutId={sessionItem.tryout.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Riwayat Tanggapan Terkirim
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ringkasan tanggapan yang sudah kamu kirim berdasarkan aspek pembelajaran.
            </p>
          </div>

          {recentFeedbacks.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
              Belum ada tanggapan yang tersimpan.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recentFeedbacks.map((feedbackItem) => (
                <FeedbackHistoryCard
                  key={feedbackItem.id}
                  aspect={feedbackItem.aspect}
                  comment={feedbackItem.comment}
                  createdAt={feedbackItem.createdAt}
                  sentiment={feedbackItem.sentiment?.label ?? null}
                  subjectName={feedbackItem.subject.name}
                  title={feedbackItem.tryoutSession.tryout.title}
                  tryoutId={feedbackItem.tryoutSession.tryout.id}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function FeedbackSummaryCard({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: "blue" | "emerald" | "orange";
  value: string;
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-100 text-orange-700"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <FeedbackMetricIcon />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
          Ringkasan
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function PendingFeedbackTryoutCard({
  subjectName,
  submittedAt,
  title,
  tryoutId,
}: {
  subjectName: string;
  submittedAt: Date | null;
  title: string;
  tryoutId: string;
}) {
  return (
    <article className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {subjectName}
        </span>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          Menunggu tanggapan
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">
        Selesai dikerjakan {submittedAt ? formatDate(submittedAt) : "baru-baru ini"}.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/siswa/tryout/${tryoutId}`}
          className="inline-flex h-11 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500"
        >
          Buka Tryout
        </Link>
        <span className="text-sm text-slate-500">
          Lanjutkan dengan mengisi tanggapan belajar pada sesi tryout ini.
        </span>
      </div>
    </article>
  );
}

function FeedbackHistoryCard({
  aspect,
  comment,
  createdAt,
  sentiment,
  subjectName,
  title,
  tryoutId,
}: {
  aspect: LearningAspect;
  comment: string;
  createdAt: Date;
  sentiment: SentimentLabel | null;
  subjectName: string;
  title: string;
  tryoutId: string;
}) {
  return (
    <article className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {subjectName}
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          {aspectLabelMap[aspect]}
        </span>
        {sentiment ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              sentiment === SentimentLabel.POSITIF
                ? "bg-emerald-100 text-emerald-700"
                : sentiment === SentimentLabel.NEGATIF
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-200 text-slate-700"
            }`}
          >
            {sentimentLabelMap[sentiment]}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{comment}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          {formatDate(createdAt)}
        </span>
        <Link
          href={`/siswa/tryout/${tryoutId}`}
          className="text-sm font-semibold text-blue-700 transition hover:text-blue-800"
        >
          Lihat tryout
        </Link>
      </div>
    </article>
  );
}

const aspectLabelMap: Record<LearningAspect, string> = {
  [LearningAspect.MATERI]: "Materi",
  [LearningAspect.PENYAMPAIAN]: "Penyampaian",
  [LearningAspect.SOAL]: "Soal",
};

const sentimentLabelMap: Record<SentimentLabel, string> = {
  [SentimentLabel.POSITIF]: "Positif",
  [SentimentLabel.NEGATIF]: "Negatif",
  [SentimentLabel.NETRAL]: "Netral",
};

function FeedbackMetricIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M5.5 7.5A2.5 2.5 0 0 1 8 5h8a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 16 15H11l-3.5 3v-3H8A2.5 2.5 0 0 1 5.5 12.5v-5Z" />
      <path d="M9 9.5h6" />
      <path d="M9 12h4" />
    </svg>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
