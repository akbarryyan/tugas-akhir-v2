import Link from "next/link";
import { TryoutStatus } from "@prisma/client";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isFeedbackComplete } from "@/lib/student-feedback";

export default async function SiswaProgresPage() {
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

  const [availableTryoutCount, completedSessions] = await Promise.all([
    prisma.tryout.count({
      where: {
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
    }),
    studentProfile
      ? prisma.tryoutSession.findMany({
          where: {
            studentId: studentProfile.id,
            status: {
              in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
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
            score: true,
            correctAnswers: true,
            feedbacks: {
              select: {
                aspect: true,
              },
            },
            totalQuestions: true,
            submittedAt: true,
            tryout: {
              select: {
                title: true,
                subject: {
                  select: {
                    id: true,
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
        })
      : [],
  ]);

  const pendingFeedbackCount = completedSessions.filter(
    (sessionItem) => !isFeedbackComplete(sessionItem.feedbacks),
  ).length;

  const completionRate =
    availableTryoutCount === 0
      ? 0
      : Math.min(100, Math.round((completedSessions.length / availableTryoutCount) * 100));

  const averageScore =
    completedSessions.length === 0
      ? "-"
      : (
          completedSessions.reduce(
            (sum, sessionItem) => sum + Number(sessionItem.score ?? 0),
            0,
          ) / completedSessions.length
        ).toFixed(0);

  const averageAccuracy =
    completedSessions.length === 0
      ? 0
      : Math.round(
          (completedSessions.reduce((sum, sessionItem) => {
            if (sessionItem.totalQuestions === 0) {
              return sum;
            }

            return sum + (sessionItem.correctAnswers / sessionItem.totalQuestions) * 100;
          }, 0) /
            completedSessions.length),
        );

  const subjectMap = new Map<
    string,
    {
      completedCount: number;
      name: string;
      totalCorrect: number;
      totalQuestions: number;
    }
  >();

  for (const sessionItem of completedSessions) {
    const current = subjectMap.get(sessionItem.tryout.subject.id) ?? {
      completedCount: 0,
      name: sessionItem.tryout.subject.name,
      totalCorrect: 0,
      totalQuestions: 0,
    };

    current.completedCount += 1;
    current.totalCorrect += sessionItem.correctAnswers;
    current.totalQuestions += sessionItem.totalQuestions;

    subjectMap.set(sessionItem.tryout.subject.id, current);
  }

  const subjectProgress = Array.from(subjectMap.values())
    .map((item) => ({
      ...item,
      accuracy:
        item.totalQuestions === 0
          ? 0
          : Math.round((item.totalCorrect / item.totalQuestions) * 100),
    }))
    .sort((left, right) => right.completedCount - left.completedCount || right.accuracy - left.accuracy);

  const latestProgressItems = completedSessions.slice(0, 4);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Aktivitas Belajar
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Progres</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Pantau perkembangan latihanmu dari jumlah tryout yang selesai, rata-rata nilai, dan
            kekuatan belajar berdasarkan mata pelajaran yang sudah kamu kerjakan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/siswa/hasil"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Lihat Hasil
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <ProgressMetricCard
          label="Tryout Selesai"
          helper={`${completionRate}% dari tryout yang tersedia sudah kamu selesaikan.`}
          tone="blue"
          value={String(completedSessions.length)}
        />
        <ProgressMetricCard
          label="Rata-rata Nilai"
          helper="Rata-rata skor dari seluruh tryout yang sudah dikirim."
          tone="emerald"
          value={averageScore}
        />
        <ProgressMetricCard
          label="Akurasi Rata-rata"
          helper="Persentase jawaban benar secara keseluruhan."
          tone="violet"
          value={`${averageAccuracy}%`}
        />
        <ProgressMetricCard
          label="Tanggapan Belum Lengkap"
          helper="Tryout yang masih perlu kamu tindak lanjuti dengan umpan balik pembelajaran."
          tone="orange"
          value={String(pendingFeedbackCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Ringkasan Perkembangan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gambaran singkat tentang progres belajar yang sudah kamu capai sejauh ini.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <ProgressHighlight
              label="Penyelesaian Tryout"
              value={`${completionRate}%`}
              helper={`${completedSessions.length} dari ${availableTryoutCount} tryout sudah selesai.`}
              percent={completionRate}
              tone="blue"
            />
            <ProgressHighlight
              label="Kelengkapan Tanggapan"
              value={`${completedSessions.length === 0 ? 0 : Math.max(0, 100 - Math.round((pendingFeedbackCount / completedSessions.length) * 100))}%`}
              helper={`${Math.max(0, completedSessions.length - pendingFeedbackCount)} tryout sudah punya umpan balik pembelajaran.`}
              percent={
                completedSessions.length === 0
                  ? 0
                  : Math.max(0, 100 - Math.round((pendingFeedbackCount / completedSessions.length) * 100))
              }
              tone="emerald"
            />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Fokus Berikutnya
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {pendingFeedbackCount > 0
                ? `Masih ada ${pendingFeedbackCount} tryout yang belum dilengkapi umpan balik pembelajaran. Menyelesaikannya akan membantu evaluasi belajarmu jadi lebih lengkap.`
                : completedSessions.length > 0
                  ? "Progresmu sudah cukup rapi. Kamu bisa lanjut mengerjakan tryout lain untuk menambah jam latihan."
                  : "Mulailah dari satu tryout terlebih dahulu agar perkembangan belajarmu mulai tercatat di sistem."}
            </p>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Progres per Mata Pelajaran
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mata pelajaran yang paling sering kamu kerjakan dan tingkat akurasinya.
            </p>
          </div>

          {subjectProgress.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
              Belum ada data progres per mata pelajaran.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {subjectProgress.map((item) => (
                <SubjectProgressRow
                  key={item.name}
                  accuracy={item.accuracy}
                  completedCount={item.completedCount}
                  subjectName={item.name}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Aktivitas Progres Terbaru
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Riwayat terakhir yang memengaruhi progres belajar kamu.
            </p>
          </div>
          <Link
            href="/siswa/tryout"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Buka Tryout
          </Link>
        </div>

        {latestProgressItems.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
            Aktivitas progres akan muncul setelah kamu menyelesaikan tryout.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {latestProgressItems.map((sessionItem) => (
              <LatestProgressCard
                key={sessionItem.id}
                accuracy={
                  sessionItem.totalQuestions === 0
                    ? 0
                    : Math.round((sessionItem.correctAnswers / sessionItem.totalQuestions) * 100)
                }
                score={
                  sessionItem.score !== null && sessionItem.score !== undefined
                    ? Number(sessionItem.score).toFixed(0)
                    : "-"
                }
                subjectName={sessionItem.tryout.subject.name}
                submittedAt={sessionItem.submittedAt}
                title={sessionItem.tryout.title}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProgressMetricCard({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: "blue" | "emerald" | "orange" | "violet";
  value: string;
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-100 text-orange-700"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : tone === "violet"
          ? "bg-violet-100 text-violet-700"
          : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <ProgressIcon />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
          Update
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function ProgressHighlight({
  helper,
  label,
  percent,
  tone,
  value,
}: {
  helper: string;
  label: string;
  percent: number;
  tone: "blue" | "emerald";
  value: string;
}) {
  const barClass = tone === "emerald" ? "bg-emerald-500" : "bg-blue-600";

  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{helper}</p>
        </div>
        <span className="text-lg font-semibold text-slate-950">{value}</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function SubjectProgressRow({
  accuracy,
  completedCount,
  subjectName,
}: {
  accuracy: number;
  completedCount: number;
  subjectName: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{subjectName}</p>
          <p className="mt-1 text-sm text-slate-500">{completedCount} tryout selesai</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900">
          {accuracy}%
        </span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)]"
          style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
        />
      </div>
    </div>
  );
}

function LatestProgressCard({
  accuracy,
  score,
  subjectName,
  submittedAt,
  title,
}: {
  accuracy: number;
  score: string;
  subjectName: string;
  submittedAt: Date | null;
  title: string;
}) {
  return (
    <article className="rounded-[1.55rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {subjectName}
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          {accuracy}% akurasi
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">
        {submittedAt ? `Dikirim pada ${formatDate(submittedAt)}` : "Hasil terbaru tersimpan di sistem."}
      </p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Nilai
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{score}</p>
        </div>
      </div>
    </article>
  );
}

function ProgressIcon() {
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
      <path d="M6 17.5V12" />
      <path d="M12 17.5V7.5" />
      <path d="M18 17.5v-4" />
      <path d="M4 19.5h16" />
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
