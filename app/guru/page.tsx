import Link from "next/link";

import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function GuruPage() {
  const session = await getCurrentSession();
  const teacherUserId = session?.user.id ?? "";

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: teacherUserId,
    },
    select: {
      id: true,
      subjectTeachers: {
        select: {
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

  const [
    questionCount,
    bankSoalCount,
    publishedTryoutCount,
    draftTryoutCount,
    tryoutSessionCount,
    latestTryouts,
    subjectPerformance,
  ] = teacherProfile
    ? await Promise.all([
        prisma.question.count({
          where: {
            createdByTeacherId: teacherProfile.id,
            isActive: true,
          },
        }),
        prisma.bankSoal.count({
          where: {
            createdByTeacherId: teacherProfile.id,
            isActive: true,
          },
        }),
        prisma.tryout.count({
          where: {
            createdByTeacherId: teacherProfile.id,
            isPublished: true,
          },
        }),
        prisma.tryout.count({
          where: {
            createdByTeacherId: teacherProfile.id,
            isPublished: false,
          },
        }),
        prisma.tryoutSession.count({
          where: {
            tryout: {
              createdByTeacherId: teacherProfile.id,
            },
          },
        }),
        prisma.tryout.findMany({
          where: {
            createdByTeacherId: teacherProfile.id,
          },
          include: {
            subject: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                sessions: true,
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
          take: 3,
        }),
        prisma.subject.findMany({
          where: {
            id: {
              in: teacherProfile.subjectTeachers.map((item) => item.subjectId),
            },
          },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                questions: {
                  where: {
                    createdByTeacherId: teacherProfile.id,
                    isActive: true,
                  },
                },
              },
            },
          },
        }),
      ])
    : [0, 0, 0, 0, 0, [], []];

  const topSubject = [...subjectPerformance].sort(
    (left, right) => right._count.questions - left._count.questions,
  )[0];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_42%,#f8fbff_100%)] p-6 shadow-[0_20px_56px_rgba(15,23,42,0.06)] sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Ruang Kerja Guru
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Kelola evaluasi belajar sesuai mata pelajaran yang Anda ampu.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Area guru difokuskan untuk penyusunan bank soal, penyusunan paket tryout,
          serta peninjauan hasil siswa dan tanggapan pembelajaran. Modul tryout
          menjadi pusat kerja utama karena paket evaluasi sebaiknya disusun oleh guru
          yang memahami mapel dan tingkat kesulitan soal.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Mapel Diampu"
          value={teacherProfile?.subjectTeachers.length ?? 0}
          description="Mata pelajaran yang menjadi ruang kerja guru di sistem."
        />
        <MetricCard
          label="Soal Aktif"
          value={questionCount}
          description="Soal mentah aktif yang siap dimasukkan ke bank soal."
        />
        <MetricCard
          label="Bank Soal"
          value={bankSoalCount}
          description="Koleksi soal yang siap dipakai sebagai dasar penyusunan tryout."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ringkasan Operasional
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Pantau progres tryout dan aktivitas evaluasi
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Gunakan ringkasan ini untuk melihat kesiapan paket tryout yang sudah Anda susun.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FeatureCard
              accent="sky"
              title={`${publishedTryoutCount} tryout dipublikasikan`}
              description="Paket tryout yang saat ini sudah dapat dilihat dan dikerjakan siswa."
            />
            <FeatureCard
              accent="emerald"
              title={`${draftTryoutCount} tryout masih draft`}
              description="Paket yang masih bisa Anda rapikan setelah memilih bank soal yang tepat."
            />
            <FeatureCard
              accent="amber"
              title={`${tryoutSessionCount} sesi tryout siswa`}
              description="Total sesi pengerjaan siswa yang sudah tercatat dari seluruh tryout Anda."
            />
            <FeatureCard
              accent="sky"
              title={
                topSubject
                  ? `${topSubject.name} paling siap digunakan`
                  : "Belum ada mapel dominan"
              }
              description={
                topSubject
                  ? `${topSubject._count.questions} soal aktif tersedia pada mata pelajaran ini.`
                  : "Tambahkan soal lalu susun bank soal agar sistem dapat menampilkan mapel teratas."
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f2f9ff_100%)] p-6 shadow-[0_18px_48px_rgba(14,116,144,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Modul Prioritas
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Kelola soal dan tryout dari satu area
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Mulailah dari kelola soal untuk menyiapkan soal mentah, susun ke dalam bank soal, lalu bangun paket tryout dari koleksi itu.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {(teacherProfile?.subjectTeachers ?? []).slice(0, 4).map((item) => (
                <span
                  key={item.subject.name}
                  className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                >
                  {item.subject.name}
                </span>
              ))}
              {(teacherProfile?.subjectTeachers.length ?? 0) === 0 ? (
                <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                  Belum ada mapel ampuan
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/guru/soal"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                Kelola Soal
              </Link>
              <Link
                href="/guru/bank-soal"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
              >
                Bank Soal
              </Link>
              <Link
                href="/guru/tryout"
                className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Buka Modul Tryout
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tryout Terbaru
            </p>
            {latestTryouts.length === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-500">
                Belum ada tryout yang dibuat. Mulailah dari menyusun paket tryout pertama untuk mata pelajaran yang Anda ampu.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {latestTryouts.map((tryout, index) => (
                  <TeacherStep
                    key={tryout.id}
                    index={`0${index + 1}`}
                    title={tryout.title}
                    description={`${tryout.subject.name} • ${tryout._count.tryoutQuestions} soal • ${tryout._count.sessions} sesi siswa • ${tryout.isPublished ? "Dipublikasikan" : "Draft"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.7rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function FeatureCard({
  accent,
  description,
  title,
}: {
  accent: "amber" | "emerald" | "sky";
  description: string;
  title: string;
}) {
  const accentClass =
    accent === "sky"
      ? "bg-sky-100 text-sky-700"
      : accent === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-5">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${accentClass}`}>
        Fokus
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function TeacherStep({
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
