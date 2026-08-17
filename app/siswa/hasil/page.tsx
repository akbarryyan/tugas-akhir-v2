import Link from "next/link";
import { TryoutStatus } from "@prisma/client";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isFeedbackComplete } from "@/lib/student-feedback";

export default async function SiswaHasilPage() {
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

  const completedSessions = studentProfile
    ? await prisma.tryoutSession.findMany({
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
          totalQuestions: true,
          submittedAt: true,
          status: true,
          feedbacks: {
            select: {
              aspect: true,
            },
          },
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
      })
    : [];

  const bestScore =
    completedSessions.length === 0
      ? "-"
      : Number(
          completedSessions.reduce((highest, sessionItem) => {
            const nextValue = Number(sessionItem.score ?? 0);
            return nextValue > highest ? nextValue : highest;
          }, 0),
        ).toFixed(0);

  const averageScore =
    completedSessions.length === 0
      ? "-"
      : (
          completedSessions.reduce(
            (sum, sessionItem) => sum + Number(sessionItem.score ?? 0),
            0,
          ) / completedSessions.length
        ).toFixed(0);

  const waitingFeedbackCount = completedSessions.filter(
    (sessionItem) => !isFeedbackComplete(sessionItem.feedbacks),
  ).length;

  return (
    <div className="space-y-5">
      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Aktivitas Belajar
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Hasil</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Tinjau hasil tryout yang sudah kamu kerjakan, bandingkan progresnya, dan lihat tryout
            mana yang masih perlu kamu lengkapi dengan umpan balik pembelajaran.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ResultSummaryCard
          label="Total Tryout Selesai"
          helper="Riwayat tryout yang sudah kamu kirim dan tersimpan."
          value={String(completedSessions.length)}
          tone="blue"
        />
        <ResultSummaryCard
          label="Nilai Terbaik"
          helper="Skor tertinggi yang berhasil kamu capai sejauh ini."
          value={bestScore}
          tone="emerald"
        />
        <ResultSummaryCard
          label="Rata-rata Nilai"
          helper={`${waitingFeedbackCount} tryout masih menunggu umpan balik pembelajaran.`}
          value={averageScore}
          tone="orange"
        />
      </section>

      <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Riwayat Hasil Tryout
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Semua hasil tryout terbaru ditampilkan dari yang paling baru kamu kerjakan.
            </p>
          </div>
          <Link
            href="/siswa/tryout"
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Lihat Daftar Tryout
          </Link>
        </div>

        {completedSessions.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
            Belum ada hasil tryout yang bisa ditampilkan.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {completedSessions.map((sessionItem) => (
              <ResultHistoryCard
                key={sessionItem.id}
                correctAnswers={sessionItem.correctAnswers}
                hasFeedback={isFeedbackComplete(sessionItem.feedbacks)}
                pendingSessionId={sessionItem.id}
                score={
                  sessionItem.score !== null && sessionItem.score !== undefined
                    ? Number(sessionItem.score).toFixed(0)
                    : "-"
                }
                status={sessionItem.status}
                subjectName={sessionItem.tryout.subject.name}
                submittedAt={sessionItem.submittedAt}
                title={sessionItem.tryout.title}
                totalQuestions={sessionItem.totalQuestions}
                tryoutId={sessionItem.tryout.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ResultSummaryCard({
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
          <ResultMetricIcon />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
          Rekap
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function ResultHistoryCard({
  correctAnswers,
  hasFeedback,
  pendingSessionId,
  score,
  status,
  subjectName,
  submittedAt,
  title,
  totalQuestions,
  tryoutId,
}: {
  correctAnswers: number;
  hasFeedback: boolean;
  pendingSessionId: string;
  score: string;
  status: TryoutStatus;
  subjectName: string;
  submittedAt: Date | null;
  title: string;
  totalQuestions: number;
  tryoutId: string;
}) {
  return (
    <article className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {subjectName}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasFeedback ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
          }`}
        >
          {hasFeedback ? "Umpan balik lengkap" : "Perlu umpan balik"}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetaBox label="Nilai" value={score} />
        <MetaBox label="Benar" value={`${correctAnswers}/${totalQuestions}`} />
        <MetaBox
          label="Dikirim"
          value={submittedAt ? formatDate(submittedAt) : status === TryoutStatus.GRADED ? "Dinilai" : "Terkirim"}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/siswa/tryout/${tryoutId}`}
          className="inline-flex h-11 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500"
        >
          Lihat Detail
        </Link>
        {!hasFeedback ? (
          <Link
            href={`/siswa/tanggapan?session=${pendingSessionId}#form-tanggapan`}
            className="inline-flex h-11 items-center rounded-full border border-orange-200 bg-orange-50 px-5 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
          >
            Isi Tanggapan
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function MetaBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ResultMetricIcon() {
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
