import Link from "next/link";
import { Prisma, TryoutStatus } from "@prisma/client";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function SiswaPage() {
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

  const [
    availableTryoutCount,
    completedTryoutCount,
    latestFinishedTryout,
    pendingFeedbackCount,
    availableTryouts,
    recentTryoutResults,
    pendingFeedbackSessions,
  ] =
    studentProfile
      ? await Promise.all([
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
          prisma.tryoutSession.count({
            where: {
              studentId: studentProfile.id,
              status: {
                in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
              },
            },
          }),
          prisma.tryoutSession.findFirst({
            where: {
              studentId: studentProfile.id,
              status: {
                in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
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
            select: {
              tryout: {
                select: {
                  title: true,
                  subject: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              score: true,
            },
          }),
          prisma.tryoutSession.count({
            where: {
              studentId: studentProfile.id,
              status: {
                in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
              },
              feedbacks: {
                none: {},
              },
            },
          }),
          prisma.tryout.findMany({
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
            include: {
              subject: {
                select: {
                  name: true,
                },
              },
              _count: {
                select: {
                  tryoutQuestions: true,
                },
              },
            },
            orderBy: [
              {
                updatedAt: "desc",
              },
              {
                createdAt: "desc",
              },
            ],
            take: 6,
          }),
          prisma.tryoutSession.findMany({
            where: {
              studentId: studentProfile.id,
              status: {
                in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
              },
            },
            select: {
              id: true,
              score: true,
              submittedAt: true,
              tryout: {
                select: {
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
            take: 4,
          }),
          prisma.tryoutSession.findMany({
            where: {
              studentId: studentProfile.id,
              status: {
                in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
              },
              feedbacks: {
                none: {},
              },
            },
            select: {
              id: true,
              submittedAt: true,
              tryout: {
                select: {
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
            take: 4,
          }),
        ])
      : [0, 0, null, 0, [], [], []];

  const latestScore =
    latestFinishedTryout?.score !== null && latestFinishedTryout?.score !== undefined
      ? Number(latestFinishedTryout.score).toFixed(0)
      : "-";
  const latestTryoutLabel = latestFinishedTryout?.tryout.title ?? "Belum ada tryout selesai";
  const latestTryoutSubject =
    latestFinishedTryout?.tryout.subject.name ?? "Hasil akan muncul setelah tryout selesai.";
  const completionRate =
    availableTryoutCount === 0
      ? 0
      : Math.min(100, Math.round((completedTryoutCount / availableTryoutCount) * 100));
  const feedbackCompletionCount = Math.max(0, completedTryoutCount - pendingFeedbackCount);
  const feedbackCompletionRate =
    completedTryoutCount === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((feedbackCompletionCount / completedTryoutCount) * 100)));

  const tryoutCards: Prisma.TryoutGetPayload<{
    include: {
      subject: {
        select: {
          name: true;
        };
      };
      _count: {
        select: {
          tryoutQuestions: true;
        };
      };
    };
  }>[] = availableTryouts;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ringkasan tryout, hasil terbaru, dan aktivitas belajar yang perlu kamu tindak lanjuti.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600">
            Hari ini
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)]">
            Fokus Periode
          </span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <StudentMetricCard
          accent="orange"
          helper={`${availableTryoutCount} paket siap dikerjakan`}
          label="Tryout Tersedia"
          trend="Aktif"
          value={String(availableTryoutCount)}
        />
        <StudentMetricCard
          accent="emerald"
          helper={latestTryoutSubject}
          label="Nilai Terbaru"
          trend="Terbaru"
          value={latestScore}
        />
        <StudentMetricCard
          accent="blue"
          helper={`${pendingFeedbackCount} feedback menunggu`}
          label="Tanggapan"
          trend="Perlu diisi"
          value={String(pendingFeedbackCount)}
        />
        <StudentMetricCard
          accent="violet"
          helper={`${recentTryoutResults.length} hasil tercatat`}
          label="Progres"
          trend={`${completionRate}%`}
          value={`${completionRate}%`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.48fr]">
        <div className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Current Statistic</p>
              <p className="mt-2 text-sm text-slate-400">Ringkasan capaian belajar terbaru</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Overview
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatMiniCard
              label="Sesi Selesai"
              tone="blue"
              value={String(completedTryoutCount)}
            />
            <StatMiniCard
              label="Feedback Selesai"
              tone="emerald"
              value={String(feedbackCompletionCount)}
            />
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/85 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Snapshot Belajar</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Visual ringkas untuk tryout, progres, hasil, dan feedback.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                Responsive
              </span>
            </div>

            <div className="mt-6 flex min-h-[220px] items-end justify-between gap-3 sm:gap-4">
              <StatisticBar
                color="from-orange-400 to-amber-300"
                heightPercent={Math.max(24, Math.min(100, availableTryoutCount * 20))}
                label="Tryout"
                value={String(availableTryoutCount)}
              />
              <StatisticBar
                color="from-blue-600 to-sky-400"
                heightPercent={Math.max(24, completionRate)}
                label="Progres"
                value={`${completionRate}%`}
              />
              <StatisticBar
                color="from-emerald-500 to-green-300"
                heightPercent={Math.max(24, Math.min(100, completedTryoutCount * 18))}
                label="Hasil"
                value={String(completedTryoutCount)}
              />
              <StatisticBar
                color="from-fuchsia-500 to-pink-300"
                heightPercent={Math.max(18, feedbackCompletionRate)}
                label="Feedback"
                value={`${feedbackCompletionRate}%`}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <LegendRow
              color="bg-blue-500"
              label="Progres belajar"
              meta={`${completedTryoutCount} sesi selesai`}
              value={`${completionRate}%`}
            />
            <LegendRow
              color="bg-emerald-400"
              label="Feedback terselesaikan"
              meta={`${feedbackCompletionCount} dari ${completedTryoutCount || 0} sesi`}
              value={`${feedbackCompletionRate}%`}
            />
            <LegendRow
              color="bg-orange-400"
              label="Tryout aktif"
              meta="Siap dikerjakan"
              value={String(availableTryoutCount)}
            />
            <LegendRow
              color="bg-fuchsia-400"
              label="Feedback menunggu"
              meta="Perlu ditindaklanjuti"
              value={String(pendingFeedbackCount)}
            />
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Aktivitas Belajar</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Ringkasan tryout dan progresmu
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Lihat hasil terakhir, paket tryout yang tersedia, dan daftar tanggapan yang masih perlu kamu isi.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Periode belajar aktif
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(135deg,#eef5ff_0%,#ffffff_100%)] p-5">
              <p className="text-sm font-semibold text-blue-700">{latestTryoutSubject}</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {latestScore}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{latestTryoutLabel}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {latestFinishedTryout
                  ? "Nilai terbaru ini membantu kamu melihat hasil belajar terakhir sebelum lanjut ke tryout berikutnya."
                  : "Kamu belum memiliki tryout yang selesai. Setelah menyelesaikan tryout, hasil terbarumu akan tampil di sini."}
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-slate-200/80 bg-slate-50/85 p-5">
              <p className="text-sm font-semibold text-slate-500">Tanggapan Menunggu</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {pendingFeedbackCount}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Isi feedback setelah tryout supaya guru bisa memahami pengalaman belajarmu dengan lebih baik.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <StudentCreditCard
              accent="green"
              label="Fokus Belajar"
              title={`${availableTryoutCount} tryout tersedia`}
              subtitle="Pilih tryout yang siap dikerjakan"
            />
            <StudentCreditCard
              accent="blue"
              label="Hasil Terkini"
              title={latestScore === "-" ? "Belum ada nilai" : `Skor ${latestScore}`}
              subtitle={latestTryoutLabel}
            />
            <StudentCreditCard
              accent="orange"
              label="Tindak Lanjut"
              title={`${pendingFeedbackCount} tanggapan`}
              subtitle="Selesaikan feedback setelah tryout"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div
          id="tryout"
          className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Tryout Tersedia</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Pilih paket tryout yang ingin kamu kerjakan
              </h2>
            </div>
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {tryoutCards.length} paket aktif
            </div>
          </div>

          {tryoutCards.length === 0 ? (
            <div className="mt-6 rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-6 text-slate-500">
              Belum ada tryout yang dipublikasikan untuk siswa. Coba cek lagi setelah guru atau admin menyiapkan tryout.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tryoutCards.map((tryout, index) => (
                <article
                  key={tryout.id}
                  className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(37,99,235,0.08)]"
                >
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      index % 3 === 0
                        ? "bg-blue-100 text-blue-700"
                        : index % 3 === 1
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {tryout.subject.name}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{tryout.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {tryout.description?.trim()
                      ? tryout.description
                      : `${tryout._count.tryoutQuestions} soal siap dikerjakan.`}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {tryout._count.tryoutQuestions} soal
                    </span>
                    {tryout.durationMinutes ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {tryout.durationMinutes} menit
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/siswa/tryout/${tryout.id}`}
                    className="mt-5 inline-flex items-center rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.2)] transition hover:translate-y-[-1px]"
                  >
                    Lihat Tryout
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <section
            id="hasil"
            className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]"
          >
            <p className="text-sm font-semibold text-slate-500">Hasil Terbaru</p>
            <div className="mt-5 space-y-3">
              {recentTryoutResults.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-500">
                  Belum ada riwayat hasil tryout yang bisa ditampilkan.
                </div>
              ) : (
                recentTryoutResults.map((session) => (
                  <ResultActivityRow
                    key={session.id}
                    score={
                      session.score !== null && session.score !== undefined
                        ? Number(session.score).toFixed(0)
                        : "-"
                    }
                    subjectName={session.tryout.subject.name}
                    title={session.tryout.title}
                  />
                ))
              )}
            </div>
            <div className="mt-5">
              <Link
                href="/siswa/hasil"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Buka Hasil
              </Link>
            </div>
          </section>

          <section
            id="tanggapan"
            className="rounded-[1.7rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]"
          >
            <p className="text-sm font-semibold text-slate-500">Tanggapan Belajar</p>
            <div className="mt-5 space-y-3">
              {pendingFeedbackSessions.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-500">
                  Belum ada tryout yang menunggu tanggapan.
                </div>
              ) : (
                pendingFeedbackSessions.map((session) => (
                  <PendingFeedbackCard
                    key={session.id}
                    subjectName={session.tryout.subject.name}
                    title={session.tryout.title}
                  />
                ))
              )}
            </div>
            <div className="mt-5">
              <Link
                href="/siswa/tanggapan"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Buka Tanggapan
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function StudentMetricCard({
  accent,
  helper,
  label,
  trend,
  value,
}: {
  accent: "blue" | "emerald" | "orange" | "violet";
  helper: string;
  label: string;
  trend: string;
  value: string;
}) {
  const accentMap =
    accent === "orange"
      ? {
          badge: "bg-orange-100 text-orange-700",
          icon: "bg-orange-100 text-orange-700",
        }
      : accent === "emerald"
        ? {
            badge: "bg-emerald-100 text-emerald-700",
            icon: "bg-emerald-100 text-emerald-700",
          }
        : accent === "violet"
          ? {
              badge: "bg-violet-100 text-violet-700",
              icon: "bg-violet-100 text-violet-700",
            }
          : {
              badge: "bg-blue-100 text-blue-700",
              icon: "bg-blue-100 text-blue-700",
            };

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accentMap.icon}`}>
          <MetricIcon />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accentMap.badge}`}>
          {trend}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function StatMiniCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "blue" | "emerald";
  value: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>
          {tone === "emerald" ? "Good" : "Live"}
        </span>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  meta,
  value,
}: {
  color: string;
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.2rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-xs text-slate-400">{meta}</p>
        </div>
      </div>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function StatisticBar({
  color,
  heightPercent,
  label,
  value,
}: {
  color: string;
  heightPercent: number;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3">
      <span className="text-sm font-semibold text-slate-700">{value}</span>
      <div className="relative flex h-[150px] w-full items-end justify-center rounded-[1.5rem] bg-white px-2 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)] sm:h-[170px]">
        <div
          className={`w-full rounded-[1.2rem] bg-[linear-gradient(180deg,var(--tw-gradient-stops))] ${color} transition-[height] duration-500`}
          style={{ height: `${heightPercent}%` }}
        />
      </div>
      <span className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
    </div>
  );
}

function StudentCreditCard({
  accent,
  label,
  subtitle,
  title,
}: {
  accent: "blue" | "green" | "orange";
  label: string;
  subtitle: string;
  title: string;
}) {
  const accentClass =
    accent === "green"
      ? "bg-[linear-gradient(135deg,#6cc94f_0%,#4fb64a_100%)]"
      : accent === "orange"
        ? "bg-[linear-gradient(135deg,#ff9958_0%,#ff7f4d_100%)]"
        : "bg-[linear-gradient(135deg,#4f8cff_0%,#3a72ea_100%)]";

  return (
    <div className={`rounded-[1.7rem] p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,0.12)] ${accentClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">{label}</p>
      <p className="mt-5 text-[1.65rem] font-semibold tracking-tight">{title}</p>
      <p className="mt-2 text-sm text-white/80">{subtitle}</p>
    </div>
  );
}

function ResultActivityRow({
  score,
  subjectName,
  title,
}: {
  score: string;
  subjectName: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subjectName}</p>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-950">
        {score}
      </span>
    </div>
  );
}

function PendingFeedbackCard({
  subjectName,
  title,
}: {
  subjectName: string;
  title: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subjectName}</p>
    </div>
  );
}

function MetricIcon() {
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
