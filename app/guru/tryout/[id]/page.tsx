import Link from "next/link";

import { PageIntro, SectionCard } from "@/app/admin/_components";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type GuruTryoutDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GuruTryoutDetailPage({
  params,
}: GuruTryoutDetailPageProps) {
  const session = await getCurrentSession();
  const teacherUserId = session?.user.id ?? "";
  const { id } = await params;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: {
      userId: teacherUserId,
    },
    select: {
      id: true,
    },
  });

  const tryout = teacherProfile?.id
    ? await prisma.tryout.findFirst({
        where: {
          createdByTeacherId: teacherProfile.id,
          id,
        },
        include: {
          subject: {
            select: {
              name: true,
            },
          },
          tryoutQuestions: {
            orderBy: {
              orderNumber: "asc",
            },
            include: {
              question: {
                select: {
                  correctOption: true,
                  explanation: true,
                  optionA: true,
                  optionB: true,
                  optionC: true,
                  optionD: true,
                  questionText: true,
                },
              },
            },
          },
          _count: {
            select: {
              sessions: true,
            },
          },
        },
      })
    : null;

  if (!tryout) {
    return (
      <div className="space-y-6">
        <PageIntro
          eyebrow="Detail Tryout"
          title="Tryout tidak ditemukan"
          description="Paket tryout ini belum tersedia atau tidak termasuk dalam data tryout yang Anda susun."
        />
        <SectionCard
          title="Kembali ke Modul Tryout"
          description="Buka lagi daftar tryout untuk memilih paket yang ingin Anda lihat atau kelola."
        >
          <Link
            href="/guru/tryout"
            className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Kembali ke Daftar Tryout
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Detail Tryout Guru"
        title={tryout.title}
        description="Tinjau kembali susunan soal, urutan pengerjaan, dan ringkasan paket tryout sebelum digunakan untuk kegiatan belajar siswa."
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Informasi Paket"
          description="Ringkasan utama tryout yang sedang Anda kelola."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailInfoCard label="Mata Pelajaran" value={tryout.subject.name} />
            <DetailInfoCard
              label="Status"
              value={tryout.isPublished ? "Dipublikasikan" : "Draft"}
            />
            <DetailInfoCard
              label="Jumlah Soal"
              value={`${tryout.tryoutQuestions.length} soal`}
            />
            <DetailInfoCard
              label="Sesi Siswa"
              value={`${tryout._count.sessions} sesi`}
            />
            <DetailInfoCard
              label="Durasi"
              value={
                tryout.durationMinutes
                  ? `${tryout.durationMinutes} menit`
                  : "Belum ditentukan"
              }
            />
            <DetailInfoCard
              label="Deskripsi"
              value={tryout.description?.trim() || "Belum ada deskripsi tryout."}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/guru/tryout"
              className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kembali ke Daftar Tryout
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Urutan Soal"
          description="Pastikan urutan soal sudah sesuai dengan alur belajar yang Anda inginkan."
        >
          <div className="grid gap-3">
            {tryout.tryoutQuestions.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <span>Urutan {item.orderNumber}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 normal-case tracking-normal text-emerald-700">
                    Jawaban benar: {item.question.correctOption}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {item.question.questionText}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Daftar Soal Lengkap"
        description="Berikut susunan soal tryout secara lengkap beserta pilihan jawaban dan penjelasan singkat jika tersedia."
      >
        <div className="grid gap-4">
          {tryout.tryoutQuestions.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Soal {item.orderNumber}
                </span>
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Kunci jawaban: {item.question.correctOption}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-800">
                {item.question.questionText}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <OptionPreview label="A" text={item.question.optionA} />
                <OptionPreview label="B" text={item.question.optionB} />
                <OptionPreview label="C" text={item.question.optionC} />
                <OptionPreview label="D" text={item.question.optionD} />
              </div>

              {item.question.explanation?.trim() ? (
                <div className="mt-4 rounded-[1.35rem] border border-sky-100 bg-sky-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Penjelasan
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {item.question.explanation}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function DetailInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function OptionPreview({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        Opsi {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}
