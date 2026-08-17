import {
  createTryoutAction,
} from "@/app/guru/tryout/_actions";
import Link from "next/link";
import {
  AdminStatCard,
  AdminEmptyState,
  PageIntro,
  SectionCard,
  StatusAlert,
} from "@/app/admin/_components";
import {
  ConfirmResetFormButton,
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type GuruTryoutPageProps = {
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function GuruTryoutPage({
  searchParams,
}: GuruTryoutPageProps) {
  const session = await getCurrentSession();
  const teacherUserId = session?.user.id ?? "";
  const resolvedSearchParams = await searchParams;

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
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const teacherId = teacherProfile?.id ?? "";
  const subjectOptions = Array.from(
    new Map(
      (teacherProfile?.subjectTeachers ?? []).map((item) => [item.subject.id, item.subject]),
    ).values(),
  );

  const bankSoalOptions = teacherId
    ? await prisma.bankSoal.findMany({
        where: {
          createdByTeacherId: teacherId,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
          bankSoalQuestions: {
            orderBy: {
              orderNumber: "asc",
            },
            include: {
              question: {
                select: {
                  id: true,
                  isActive: true,
                  questionText: true,
                },
              },
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
      })
    : [];

  const tryouts = teacherId
    ? await prisma.tryout.findMany({
        where: {
          createdByTeacherId: teacherId,
        },
        include: {
          bankSoal: {
            select: {
              id: true,
              title: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
          tryoutQuestions: {
            orderBy: {
              orderNumber: "asc",
            },
            select: {
              questionId: true,
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
      })
    : [];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Modul Tryout Guru"
        title="Susun dan Kelola Paket Tryout"
        description="Buat paket tryout dari bank soal yang sudah Anda susun, pilih soal yang relevan, lalu atur status publikasinya saat sudah siap dikerjakan siswa."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          accent="sky"
          label="Mapel Diampu"
          value={subjectOptions.length}
          description="Mata pelajaran yang menjadi dasar penyusunan bank soal dan tryout."
        />
        <AdminStatCard
          accent="indigo"
          label="Bank Soal"
          value={bankSoalOptions.length}
          description="Bank soal yang siap dijadikan sumber penyusunan tryout."
        />
        <AdminStatCard
          accent="emerald"
          label="Tryout Disusun"
          value={tryouts.length}
          description="Paket tryout yang telah Anda buat pada sistem."
        />
      </section>

      <SectionCard
        title="Buat Tryout Baru"
        description="Susun paket tryout baru dari bank soal yang sudah tersedia, lalu pilih subset soal yang ingin digunakan."
      >
        {subjectOptions.length === 0 ? (
          <AdminEmptyState message="Guru ini belum memiliki mata pelajaran ampuan. Hubungi admin untuk menetapkan guru pengampu terlebih dahulu." />
        ) : bankSoalOptions.length === 0 ? (
          <AdminEmptyState message="Belum ada bank soal yang tersedia. Susun bank soal terlebih dahulu sebelum membuat tryout." />
        ) : (
          <form action={createTryoutAction} className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Judul Tryout
                <input
                  name="title"
                  type="text"
                  placeholder="Contoh: Tryout Matematika Paket 1"
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Bank Soal
                <select
                  name="bankSoalId"
                  defaultValue=""
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>
                    Pilih bank soal
                  </option>
                  {bankSoalOptions.map((bankSoal) => (
                    <option key={bankSoal.id} value={bankSoal.id}>
                      {bankSoal.title} • {bankSoal.subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                Deskripsi Singkat
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Tulis tujuan atau keterangan singkat tryout."
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Durasi
                <input
                  name="durationMinutes"
                  type="number"
                  min="1"
                  placeholder="Contoh: 60"
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  name="isPublished"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Publikasikan tryout setelah disimpan
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Pilih Soal</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Centang soal yang ingin dimasukkan ke dalam paket tryout. Sistem akan memvalidasi agar soal sesuai dengan bank soal yang dipilih.
                </p>
              </div>

              <QuestionPicker bankSoals={bankSoalOptions} />
            </div>

            <div className="flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Tryout"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan paket tryout..."
                className="h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Tryout yang Sudah Disusun"
        description="Buka detail tryout untuk meninjau susunan soal, memperbarui metadata, dan mengatur status publikasinya sesuai kebutuhan pembelajaran."
      >
        {tryouts.length === 0 ? (
          <AdminEmptyState message="Belum ada paket tryout yang dibuat oleh guru ini." />
        ) : (
          <div className="grid gap-5">
            {tryouts.map((tryout) => (
              <article
                key={tryout.id}
                className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                        {tryout.subject.name}
                      </span>
                      {tryout.bankSoal ? (
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                          {tryout.bankSoal.title}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 ${
                          tryout.isPublished
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {tryout.isPublished ? "Dipublikasikan" : "Draft"}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-950">{tryout.title}</h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {tryout._count.tryoutQuestions} soal tersusun dan {tryout._count.sessions} sesi siswa tercatat.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/guru/tryout/${tryout.id}`}
                      className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Lihat Detail
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function QuestionPicker({
  bankSoals,
  selectedQuestionIds = [],
}: {
  bankSoals: Array<{
    id: string;
    title: string;
    subject: {
      id: string;
      name: string;
    };
    bankSoalQuestions: Array<{
      questionId: string;
      orderNumber: number;
      question: {
        id: string;
        isActive: boolean;
        questionText: string;
      };
    }>;
  }>;
  selectedQuestionIds?: string[];
}) {
  return (
    <div className="grid gap-4">
      {bankSoals.map((bankSoal) => (
        <div
          key={bankSoal.id}
          className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-950">{bankSoal.title}</h4>
              <p className="text-sm leading-6 text-slate-600">
                {bankSoal.subject.name} • {bankSoal.bankSoalQuestions.length} soal tersusun di bank soal ini.
              </p>
            </div>
          </div>

          {bankSoal.bankSoalQuestions.length === 0 ? (
            <p className="mt-4 rounded-[1.2rem] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Belum ada soal yang dimasukkan ke bank soal ini.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {bankSoal.bankSoalQuestions.map((item, index) => (
                <label
                  key={item.questionId}
                  className="flex items-start gap-3 rounded-[1.2rem] border border-white/80 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <input
                    name="questionIds"
                    type="checkbox"
                    value={item.questionId}
                    defaultChecked={selectedQuestionIds.includes(item.questionId)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Soal {index + 1}
                    </span>
                    <span className="mt-1 block leading-6">
                      {item.question.questionText}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
