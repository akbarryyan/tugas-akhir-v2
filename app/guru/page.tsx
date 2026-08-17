import Link from "next/link";

import {
  AdminLinkCard,
  AdminStatCard,
  PageIntro,
  SectionCard,
} from "@/app/admin/_components";
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

  // Satu mata pelajaran bisa diampu pada beberapa kelas, sehingga jumlah baris
  // penugasan bukan jumlah mata pelajaran. Diringkas dulu supaya kartu ringkasan
  // dan daftar chip tidak menghitung atau menampilkan mapel yang sama berulang.
  const taughtSubjects = Array.from(
    new Map(
      (teacherProfile?.subjectTeachers ?? []).map((item) => [
        item.subjectId,
        item.subject,
      ]),
    ).values(),
  );

  const [
    questionCount,
    bankSoalCount,
    publishedTryoutCount,
    draftTryoutCount,
    tryoutSessionCount,
    latestTryouts,
    subjectPerformance,
    analyzedFeedbackCount,
    manualReviewedSentimentCount,
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
        prisma.sentimentAnalysis.count({
          where: {
            feedback: {
              subject: {
                subjectTeachers: {
                  some: {
                    teacherId: teacherProfile.id,
                  },
                },
              },
            },
          },
        }),
        prisma.sentimentAnalysis.count({
          where: {
            feedback: {
              subject: {
                subjectTeachers: {
                  some: {
                    teacherId: teacherProfile.id,
                  },
                },
              },
            },
            labelSource: "MANUAL",
          },
        }),
      ])
    : [0, 0, 0, 0, 0, [], [], 0, 0];

  const topSubject = [...subjectPerformance].sort(
    (left, right) => right._count.questions - left._count.questions,
  )[0];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Panel Guru"
        title="Beranda Guru"
        description="Kelola evaluasi belajar sesuai mata pelajaran yang Anda ampu, mulai dari soal mentah, bank soal, hingga paket tryout yang siap dipublikasikan untuk siswa."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          accent="sky"
          label="Mapel Diampu"
          value={taughtSubjects.length}
          description="Mata pelajaran yang menjadi ruang kerja guru di sistem."
        />
        <AdminStatCard
          accent="indigo"
          label="Soal Aktif"
          value={questionCount}
          description="Soal mentah aktif yang siap dimasukkan ke bank soal."
        />
        <AdminStatCard
          accent="emerald"
          label="Bank Soal"
          value={bankSoalCount}
          description="Koleksi soal yang siap dipakai sebagai dasar penyusunan tryout."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <AdminLinkCard
          href="/guru/soal"
          title="Kelola Soal"
          metric={`${questionCount} soal aktif`}
          description="Susun soal mentah per mata pelajaran sebelum dimasukkan ke bank soal dan tryout."
        />
        <AdminLinkCard
          href="/guru/bank-soal"
          title="Bank Soal"
          metric={`${bankSoalCount} koleksi`}
          description="Kumpulkan soal-soal siap pakai menjadi bank soal yang lebih terstruktur."
        />
        <AdminLinkCard
          href="/guru/tryout"
          title="Tryout"
          metric={`${publishedTryoutCount} publik`}
          description="Bangun paket tryout dari bank soal, atur status draft, lalu publikasikan saat siap."
        />
        <AdminLinkCard
          href="/guru/feedback"
          title="Review Sentimen"
          metric={`${manualReviewedSentimentCount}/${analyzedFeedbackCount || 0} ditinjau`}
          description="Periksa hasil analisis sentimen umpan balik siswa terhadap pembelajaran dan koreksi hanya bila label otomatis belum tepat."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard
          title="Ringkasan Operasional"
          description="Pantau progres tryout, kesiapan soal, dan aktivitas evaluasi terbaru dari area guru."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              accent="sky"
              title={`${publishedTryoutCount} tryout dipublikasikan`}
              description="Paket tryout yang saat ini sudah dapat dilihat dan dikerjakan siswa."
            />
            <FeatureCard
              accent="emerald"
              title={`${draftTryoutCount} tryout masih draft`}
              description="Paket yang masih bisa Anda rapikan sebelum dipublikasikan."
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
            <FeatureCard
              accent="emerald"
              title={`${manualReviewedSentimentCount} umpan balik ditinjau`}
              description={
                analyzedFeedbackCount > 0
                  ? `${Math.max(0, analyzedFeedbackCount - manualReviewedSentimentCount)} umpan balik lain masih memakai label otomatis.`
                  : "Belum ada umpan balik teranalisis pada mata pelajaran ampuan Anda."
              }
            />
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard
            title="Modul Prioritas"
            description="Mulailah dari kelola soal, susun bank soal, lalu bentuk paket tryout yang siap dipakai."
          >
            <div className="flex flex-wrap gap-3">
              {taughtSubjects.slice(0, 4).map((subject) => (
                <span
                  key={subject.name}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                >
                  {subject.name}
                </span>
              ))}
              {taughtSubjects.length === 0 ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-500">
                  Belum ada mapel ampuan
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/guru/soal"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                Kelola Soal
              </Link>
              <Link
                href="/guru/bank-soal"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                Bank Soal
              </Link>
              <Link
                href="/guru/tryout"
                className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Buka Modul Tryout
              </Link>
              <Link
                href="/guru/feedback"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                Review Feedback
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            title="Tryout Terbaru"
            description="Pantau paket tryout terakhir yang Anda susun dan lihat status kerjanya dengan cepat."
          >
            {latestTryouts.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-500">
                Belum ada tryout yang dibuat. Mulailah dari menyusun paket tryout pertama untuk mata pelajaran yang Anda ampu.
              </div>
            ) : (
              <div className="space-y-4">
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
          </SectionCard>
        </div>
      </section>
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
