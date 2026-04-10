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
            take: 3,
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
      : [0, null, 0, [], [], []];

  const latestScore =
    latestFinishedTryout?.score !== null && latestFinishedTryout?.score !== undefined
      ? Number(latestFinishedTryout.score).toFixed(0)
      : "-";
  const latestTryoutLabel = latestFinishedTryout?.tryout.title ?? "Belum ada tryout selesai";
  const latestTryoutSubject =
    latestFinishedTryout?.tryout.subject.name ?? "Hasil akan muncul setelah kamu menyelesaikan tryout.";
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
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef8ff_48%,#f8fdff_100%)] p-6 shadow-[0_20px_56px_rgba(14,116,144,0.08)] sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Beranda Siswa
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
            Belajar lebih terarah lewat tryout dan tanggapan yang jujur.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Gunakan halaman ini untuk melihat tryout yang tersedia, meninjau hasil yang
            sudah selesai, dan mengisi tanggapan agar kegiatan belajar berikutnya bisa
            semakin baik.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StudentStatCard
              label="Tryout Tersedia"
              value={String(availableTryoutCount)}
              description="Siap dikerjakan"
            />
            <StudentStatCard
              label="Hasil Terbaru"
              value={latestScore}
              description="Nilai terakhir"
            />
            <StudentStatCard
              label="Tanggapan"
              value={String(pendingFeedbackCount)}
              description="Menunggu diisi"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(14,116,144,0.07)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Langkah Berikutnya
          </p>
          <div className="mt-5 space-y-4">
            <StudentStep
              index="01"
              title="Pilih tryout"
              description="Buka daftar mata pelajaran dan pilih latihan yang ingin kamu kerjakan."
            />
            <StudentStep
              index="02"
              title="Kerjakan dengan fokus"
              description="Periksa soal dengan teliti dan selesaikan tryout sampai tuntas."
            />
            <StudentStep
              index="03"
              title="Lihat hasil dan isi tanggapan"
              description="Setelah selesai, cek hasilmu lalu isi tanggapan dengan bahasa yang jelas."
            />
          </div>
        </div>
      </section>

      <section id="tryout" className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                Tryout
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Tryout yang bisa kamu pilih
              </h2>
            </div>
            <p className="text-sm text-slate-500">Pilih tryout yang sudah dipublikasikan untuk mulai berlatih.</p>
          </div>

          {tryoutCards.length === 0 ? (
            <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm leading-6 text-slate-500">
              Belum ada tryout yang dipublikasikan untuk siswa. Coba cek lagi setelah guru atau admin menyiapkan tryout.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tryoutCards.map((tryout, index) => (
                <article
                  key={tryout.id}
                  className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(14,116,144,0.08)]"
                >
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      index % 3 === 0
                        ? "bg-sky-100 text-sky-700"
                        : index % 3 === 1
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {tryout.subject.name}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">
                    {tryout.title}
                  </h3>
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
                    className="mt-5 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    Lihat Tryout
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        <div id="hasil" className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Hasil Terbaru
          </p>
          <div className="mt-5 rounded-[1.75rem] bg-[linear-gradient(135deg,#e0f2fe_0%,#ffffff_100%)] p-5">
            <p className="text-sm font-semibold text-sky-700">{latestTryoutSubject}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {latestScore}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{latestTryoutLabel}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {latestFinishedTryout
                ? "Ini adalah hasil tryout terbaru yang sudah kamu selesaikan. Gunakan nilai ini untuk melihat perkembangan belajarmu."
                : "Kamu belum memiliki hasil tryout yang selesai. Setelah menyelesaikan tryout, nilai terbaru akan tampil di sini."}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {recentTryoutResults.length > 1 ? (
              recentTryoutResults.slice(1).map((session) => (
                <MiniResultRow
                  key={session.id}
                  label={session.tryout.subject.name}
                  value={
                    session.score !== null && session.score !== undefined
                      ? Number(session.score).toFixed(0)
                      : "-"
                  }
                />
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                Belum ada riwayat hasil tryout lain yang bisa ditampilkan.
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="tanggapan" className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Tanggapan Belajar
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Isi tanggapan setelah tryout selesai
            </h2>
          </div>
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {pendingFeedbackCount} tanggapan menunggu
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.7rem] border border-slate-200/80 bg-slate-50/80 p-5">
            <h3 className="text-lg font-semibold text-slate-950">Kenapa tanggapanmu penting?</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Jawabanmu membantu guru memahami bagian pembelajaran yang masih perlu diperbaiki.</li>
              <li>Tanggapan yang jelas membuat evaluasi belajar jadi lebih bermanfaat untuk semua siswa.</li>
              <li>Gunakan bahasa yang sopan, singkat, dan sesuai pengalamanmu saat mengikuti tryout.</li>
            </ul>
          </div>

          <div className="rounded-[1.7rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f5fbff_100%)] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tanggapan Menunggu
            </p>
            {pendingFeedbackSessions.length === 0 ? (
              <div className="mt-4 rounded-[1.35rem] border border-dashed border-sky-100 bg-white/80 px-4 py-4 text-sm leading-6 text-slate-500">
                Belum ada tryout yang menunggu tanggapan. Setelah kamu menyelesaikan tryout, daftar tanggapan akan muncul di sini.
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  {pendingFeedbackSessions.map((session) => (
                    <PendingFeedbackCard
                      key={session.id}
                      subjectName={session.tryout.subject.name}
                      title={session.tryout.title}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-6 inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Isi Tanggapan
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StudentStatCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-4 shadow-[0_10px_24px_rgba(14,116,144,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function StudentStep({
  description,
  index,
  title,
}: {
  description: string;
  index: string;
  title: string;
}) {
  return (
    <div className="flex gap-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-semibold text-sky-700">
        {index}
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function MiniResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
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
    <div className="rounded-[1.2rem] border border-sky-100 bg-white px-4 py-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{subjectName}</p>
    </div>
  );
}
