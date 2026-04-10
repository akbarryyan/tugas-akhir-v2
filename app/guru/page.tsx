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
          subject: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const [questionCount, tryoutCount] = teacherProfile
    ? await Promise.all([
        prisma.question.count({
          where: {
            createdByTeacherId: teacherProfile.id,
            isActive: true,
          },
        }),
        prisma.tryout.count({
          where: {
            createdByTeacherId: teacherProfile.id,
          },
        }),
      ])
    : [0, 0];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
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
          description="Bank soal aktif yang siap dipakai untuk menyusun tryout."
        />
        <MetricCard
          label="Tryout"
          value={tryoutCount}
          description="Paket tryout yang sudah tersusun pada area kerja guru."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Fokus Utama
          </p>
          <div className="mt-5 grid gap-4">
            <FeatureCard
              title="Penyusunan Tryout"
              description="Buat paket tryout berdasarkan mata pelajaran yang Anda ampu, lalu pilih soal yang sesuai dari bank soal."
            />
            <FeatureCard
              title="Evaluasi Hasil"
              description="Tinjau sesi pengerjaan siswa, nilai yang dihasilkan, dan perkembangan capaian belajar."
            />
            <FeatureCard
              title="Refleksi Pembelajaran"
              description="Baca tanggapan siswa setelah tryout untuk memahami bagian materi, penyampaian, atau soal yang perlu diperbaiki."
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-indigo-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-6 shadow-[0_18px_48px_rgba(79,70,229,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Modul Prioritas
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            Mulai dari penyusunan tryout guru
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Modul `guru/tryout` disiapkan sebagai pusat kerja guru untuk membangun
            paket evaluasi yang nantinya akan dikerjakan siswa.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {(teacherProfile?.subjectTeachers ?? []).slice(0, 4).map((item) => (
              <span
                key={item.subject.name}
                className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700"
              >
                {item.subject.name}
              </span>
            ))}
          </div>

          <Link
            href="/guru/tryout"
            className="mt-6 inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Buka Modul Tryout
          </Link>
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
    <div className="rounded-[1.7rem] border border-white/70 bg-white/88 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function FeatureCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-5">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
