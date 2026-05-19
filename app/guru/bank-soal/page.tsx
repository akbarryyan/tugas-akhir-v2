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
import { createBankSoalAction } from "@/app/guru/bank-soal/_actions";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type GuruBankSoalPageProps = {
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function GuruBankSoalPage({
  searchParams,
}: GuruBankSoalPageProps) {
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
  const subjectOptions = teacherId
    ? await prisma.subject.findMany({
        where: {
          id: {
            in:
              teacherProfile?.subjectTeachers.map((item) => item.subject.id) ?? [],
          },
        },
        select: {
          id: true,
          name: true,
          questions: {
            where: {
              createdByTeacherId: teacherId,
              isActive: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              questionText: true,
            },
          },
        },
      })
    : [];

  const bankSoals = teacherId
    ? await prisma.bankSoal.findMany({
        where: {
          createdByTeacherId: teacherId,
        },
        include: {
          subject: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              bankSoalQuestions: true,
              tryouts: true,
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
        eyebrow="Modul Bank Soal"
        title="Susun Bank Soal"
        description="Buat wadah soal seperti Bank Soal Agama 1, lalu pilih soal-soal yang ingin dimasukkan ke dalam koleksi tersebut sebelum dipakai pada tryout."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          accent="sky"
          label="Mapel Diampu"
          value={subjectOptions.length}
          description="Mapel yang dapat Anda susun menjadi bank soal."
        />
        <AdminStatCard
          accent="indigo"
          label="Bank Soal"
          value={bankSoals.length}
          description="Koleksi soal yang sudah Anda buat di sistem."
        />
        <AdminStatCard
          accent="emerald"
          label="Tryout Terkait"
          value={bankSoals.reduce((total, item) => total + item._count.tryouts, 0)}
          description="Jumlah tryout yang sudah menggunakan bank soal Anda."
        />
      </section>

      <SectionCard
        title="Buat Bank Soal Baru"
        description="Tentukan nama bank soal, pilih mapelnya, lalu masukkan soal-soal yang ingin digunakan."
      >
        {subjectOptions.length === 0 ? (
          <AdminEmptyState message="Guru ini belum memiliki mata pelajaran ampuan. Hubungi admin untuk menetapkan guru pengampu terlebih dahulu." />
        ) : (
          <form action={createBankSoalAction} className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nama Bank Soal
                <input
                  name="title"
                  type="text"
                  placeholder="Contoh: Bank Soal Agama 1"
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Mata Pelajaran
                <select
                  name="subjectId"
                  defaultValue=""
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>
                    Pilih mata pelajaran
                  </option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                Deskripsi
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Tulis keterangan singkat bank soal ini."
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
                />
              </label>

              <label className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 lg:col-span-2">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Aktifkan bank soal setelah disimpan
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Pilih Soal</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Centang soal-soal yang ingin dimasukkan ke bank soal. Tryout nantinya akan mengambil soal dari koleksi ini.
                </p>
              </div>

              <QuestionPicker subjects={subjectOptions} />
            </div>

            <div className="flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Bank Soal"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan bank soal..."
                className="h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Bank Soal yang Sudah Disusun"
        description="Buka detail bank soal untuk meninjau komposisi soal, memperbarui metadata, atau mengatur status aktifnya."
      >
        {bankSoals.length === 0 ? (
          <AdminEmptyState message="Belum ada bank soal yang dibuat oleh guru ini." />
        ) : (
          <div className="grid gap-5">
            {bankSoals.map((bankSoal) => (
              <article
                key={bankSoal.id}
                className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                        {bankSoal.subject.name}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          bankSoal.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {bankSoal.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        {bankSoal._count.bankSoalQuestions} soal
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Dipakai di {bankSoal._count.tryouts} tryout
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-950">{bankSoal.title}</h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {bankSoal.description?.trim() || "Belum ada deskripsi bank soal."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/guru/bank-soal/${bankSoal.id}`}
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

        <div className="mt-6">
          <Link
            href="/guru/tryout"
            className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
          >
            Lanjut ke Modul Tryout
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}


function QuestionPicker({
  selectedQuestionIds = [],
  subjects,
}: {
  selectedQuestionIds?: string[];
  subjects: Array<{
    id: string;
    name: string;
    questions: Array<{
      id: string;
      questionText: string;
    }>;
  }>;
}) {
  return (
    <div className="grid gap-4">
      {subjects.map((subject) => (
        <div
          key={subject.id}
          className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4"
        >
          <div>
            <h4 className="text-base font-semibold text-slate-950">{subject.name}</h4>
            <p className="text-sm leading-6 text-slate-600">
              {subject.questions.length} soal aktif tersedia pada mapel ini.
            </p>
          </div>

          {subject.questions.length === 0 ? (
            <p className="mt-4 rounded-[1.2rem] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Belum ada soal aktif untuk mata pelajaran ini.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {subject.questions.map((question, index) => (
                <label
                  key={question.id}
                  className="flex items-start gap-3 rounded-[1.2rem] border border-white/80 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <input
                    name="questionIds"
                    type="checkbox"
                    value={question.id}
                    defaultChecked={selectedQuestionIds.includes(question.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Soal {index + 1}
                    </span>
                    <span className="mt-1 block leading-6">{question.questionText}</span>
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
