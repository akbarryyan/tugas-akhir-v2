import {
  createTryoutAction,
  deleteTryoutAction,
  toggleTryoutPublishAction,
  updateTryoutAction,
} from "@/app/guru/tryout/_actions";
import Link from "next/link";
import {
  AdminEmptyState,
  PageIntro,
  SectionCard,
  StatusAlert,
} from "@/app/admin/_components";
import {
  ConfirmActionButton,
  ConfirmDeleteButton,
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
              questions: {
                where: {
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
          },
        },
      },
    },
  });

  const teacherId = teacherProfile?.id ?? "";
  const subjectOptions = teacherProfile?.subjectTeachers.map((item) => item.subject) ?? [];

  const tryouts = teacherId
    ? await prisma.tryout.findMany({
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
        description="Buat paket tryout dari mata pelajaran yang Anda ampu, pilih soal dari bank soal aktif, lalu atur status publikasinya saat sudah siap dikerjakan siswa."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 md:grid-cols-3">
        <TeacherMetricCard
          label="Mapel Diampu"
          value={subjectOptions.length}
          description="Mata pelajaran yang bisa dijadikan dasar penyusunan tryout."
        />
        <TeacherMetricCard
          label="Soal Aktif"
          value={subjectOptions.reduce((total, subject) => total + subject.questions.length, 0)}
          description="Total soal aktif yang tersedia di seluruh mapel yang Anda ampu."
        />
        <TeacherMetricCard
          label="Tryout Disusun"
          value={tryouts.length}
          description="Paket tryout yang telah Anda buat pada sistem."
        />
      </section>

      <SectionCard
        title="Buat Tryout Baru"
        description="Susun paket tryout baru, lalu pilih soal yang relevan dari bank soal per mata pelajaran."
      >
        {subjectOptions.length === 0 ? (
          <AdminEmptyState message="Guru ini belum memiliki mata pelajaran ampuan. Hubungi admin untuk menetapkan guru pengampu terlebih dahulu." />
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
                  Centang soal yang ingin dimasukkan ke dalam paket tryout. Sistem akan memvalidasi agar soal sesuai dengan mata pelajaran yang dipilih.
                </p>
              </div>

              <QuestionPicker subjects={subjectOptions} />
            </div>

            <div className="flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Tryout"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan paket tryout..."
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Tryout yang Sudah Disusun"
        description="Perbarui detail tryout, susun ulang pemilihan soal, atau ubah status publikasinya sesuai kebutuhan pembelajaran."
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

                    <form action={toggleTryoutPublishAction}>
                      <input type="hidden" name="tryoutId" value={tryout.id} />
                      <input
                        type="hidden"
                        name="isPublished"
                        value={tryout.isPublished ? "false" : "true"}
                      />
                      <ConfirmActionButton
                        confirmLabel={tryout.isPublished ? "Ya, jadikan draft" : "Ya, publikasikan"}
                        confirmMessage={
                          tryout.isPublished
                            ? "Tryout ini akan dikembalikan ke status draft dan tidak tampil untuk siswa."
                            : "Tryout ini akan dipublikasikan dan dapat tampil untuk siswa."
                        }
                        confirmTitle={
                          tryout.isPublished ? "Ubah Menjadi Draft" : "Publikasikan Tryout"
                        }
                        className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                          tryout.isPublished
                            ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {tryout.isPublished ? "Jadikan Draft" : "Publikasikan"}
                      </ConfirmActionButton>
                    </form>

                    <form action={deleteTryoutAction}>
                      <input type="hidden" name="tryoutId" value={tryout.id} />
                      <ConfirmDeleteButton
                        confirmTitle="Hapus Paket Tryout"
                        confirmMessage="Paket tryout ini akan dihapus beserta relasi soalnya."
                        className="h-10 rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Hapus
                      </ConfirmDeleteButton>
                    </form>
                  </div>
                </div>

                <form
                  id={`update-tryout-${tryout.id}`}
                  action={updateTryoutAction}
                  className="mt-5"
                >
                  <input type="hidden" name="tryoutId" value={tryout.id} />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Judul Tryout
                      <input
                        name="title"
                        type="text"
                        defaultValue={tryout.title}
                        className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Mata Pelajaran
                      <select
                        name="subjectId"
                        defaultValue={tryout.subjectId}
                        className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                        required
                      >
                        {subjectOptions.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                      Deskripsi Singkat
                      <textarea
                        name="description"
                        rows={3}
                        defaultValue={tryout.description ?? ""}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Durasi
                      <input
                        name="durationMinutes"
                        type="number"
                        min="1"
                        defaultValue={tryout.durationMinutes ?? ""}
                        className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
                      <input
                        name="isPublished"
                        type="checkbox"
                        defaultChecked={tryout.isPublished}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      Publikasikan tryout ini
                    </label>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">Susun Soal Tryout</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Centang ulang soal yang ingin dipertahankan pada paket tryout ini.
                      </p>
                    </div>

                    <QuestionPicker
                      selectedQuestionIds={tryout.tryoutQuestions.map((item) => item.questionId)}
                      subjects={subjectOptions}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <LoadingSubmitButton
                      idleLabel="Perbarui Tryout"
                      pendingLabel="Menyimpan..."
                      loadingMessage="Memperbarui paket tryout..."
                      className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-950">{subject.name}</h4>
              <p className="text-sm leading-6 text-slate-600">
                {subject.questions.length} soal aktif tersedia pada bank soal mapel ini.
              </p>
            </div>
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
                    <span className="mt-1 block leading-6">
                      {question.questionText}
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

function TeacherMetricCard({
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
