import { AnswerOption } from "@prisma/client";

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
import {
  createQuestionAction,
  deleteQuestionAction,
  toggleQuestionStatusAction,
  updateQuestionAction,
} from "@/app/guru/soal/_actions";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type GuruSoalPageProps = {
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function GuruSoalPage({ searchParams }: GuruSoalPageProps) {
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
  const subjectOptions = teacherProfile?.subjectTeachers.map((item) => item.subject) ?? [];

  const [questions, activeQuestionCount] = teacherId
    ? await Promise.all([
        prisma.question.findMany({
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
        }),
        prisma.question.count({
          where: {
            createdByTeacherId: teacherId,
            isActive: true,
          },
        }),
      ])
    : [[], 0];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Modul Kelola Soal"
        title="Kelola Soal"
        description="Susun soal mentah untuk mata pelajaran yang Anda ampu, aktifkan soal yang siap dipakai, lalu gunakan soal-soal ini saat membentuk bank soal."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 md:grid-cols-3">
        <TeacherMetricCard
          label="Mapel Diampu"
          value={subjectOptions.length}
          description="Mata pelajaran yang bisa Anda isi dengan soal mentah."
        />
        <TeacherMetricCard
          label="Soal Aktif"
          value={activeQuestionCount}
          description="Soal yang sudah siap dimasukkan ke bank soal."
        />
        <TeacherMetricCard
          label="Total Soal"
          value={questions.length}
          description="Seluruh soal yang pernah Anda susun di sistem."
        />
      </section>

      <SectionCard
        title="Tambah Soal Baru"
        description="Tulis soal secara lengkap beserta pilihan jawaban dan kunci yang benar."
      >
        {subjectOptions.length === 0 ? (
          <AdminEmptyState message="Guru ini belum memiliki mata pelajaran ampuan. Hubungi admin untuk menetapkan guru pengampu terlebih dahulu." />
        ) : (
          <form action={createQuestionAction} className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                Teks Soal
                <textarea
                  name="questionText"
                  rows={4}
                  placeholder="Tulis pertanyaan soal dengan jelas."
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
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

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kunci Jawaban
                <select
                  name="correctOption"
                  defaultValue=""
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>
                    Pilih opsi benar
                  </option>
                  {Object.values(AnswerOption).map((option) => (
                    <option key={option} value={option}>
                      Opsi {option}
                    </option>
                  ))}
                </select>
              </label>

              <OptionInput name="optionA" label="Opsi A" />
              <OptionInput name="optionB" label="Opsi B" />
              <OptionInput name="optionC" label="Opsi C" />
              <OptionInput name="optionD" label="Opsi D" />

              <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                Penjelasan
                <textarea
                  name="explanation"
                  rows={3}
                  placeholder="Tambahkan penjelasan singkat jika diperlukan."
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
                Aktifkan soal setelah disimpan
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Soal"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan bank soal..."
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Daftar Soal Guru"
        description="Perbarui isi soal, ubah status aktif, atau hapus soal yang sudah tidak dipakai."
      >
        {questions.length === 0 ? (
          <AdminEmptyState message="Belum ada soal yang dibuat pada area guru ini." />
        ) : (
          <div className="grid gap-5">
            {questions.map((question) => (
              <article
                key={question.id}
                className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                        {question.subject.name}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          question.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {question.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Dipakai di {question._count.tryoutQuestions} tryout
                      </span>
                    </div>
                    <h2 className="text-base font-semibold leading-7 text-slate-950">
                      {question.questionText}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <form action={toggleQuestionStatusAction}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={question.isActive ? "false" : "true"}
                      />
                      <ConfirmActionButton
                        confirmLabel={
                          question.isActive ? "Ya, nonaktifkan" : "Ya, aktifkan"
                        }
                        confirmMessage={
                          question.isActive
                            ? "Soal ini akan dinonaktifkan dan tidak bisa dipilih untuk tryout baru."
                            : "Soal ini akan diaktifkan kembali dan bisa dipilih untuk tryout."
                        }
                        confirmTitle={
                          question.isActive ? "Nonaktifkan Soal" : "Aktifkan Soal"
                        }
                        className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                          question.isActive
                            ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {question.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </ConfirmActionButton>
                    </form>

                    <form action={deleteQuestionAction}>
                      <input type="hidden" name="questionId" value={question.id} />
                      <ConfirmDeleteButton
                        confirmTitle="Hapus Soal"
                        confirmMessage="Soal ini akan dihapus dari bank soal guru."
                        className="h-10 rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Hapus
                      </ConfirmDeleteButton>
                    </form>
                  </div>
                </div>

                <form action={updateQuestionAction} className="mt-5 grid gap-5">
                  <input type="hidden" name="questionId" value={question.id} />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                      Teks Soal
                      <textarea
                        name="questionText"
                        rows={4}
                        defaultValue={question.questionText}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Mata Pelajaran
                      <select
                        name="subjectId"
                        defaultValue={question.subjectId}
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

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Kunci Jawaban
                      <select
                        name="correctOption"
                        defaultValue={question.correctOption}
                        className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                        required
                      >
                        {Object.values(AnswerOption).map((option) => (
                          <option key={option} value={option}>
                            Opsi {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <OptionInput name="optionA" label="Opsi A" defaultValue={question.optionA} />
                    <OptionInput name="optionB" label="Opsi B" defaultValue={question.optionB} />
                    <OptionInput name="optionC" label="Opsi C" defaultValue={question.optionC} />
                    <OptionInput name="optionD" label="Opsi D" defaultValue={question.optionD} />

                    <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                      Penjelasan
                      <textarea
                        name="explanation"
                        rows={3}
                        defaultValue={question.explanation ?? ""}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 lg:col-span-2">
                      <input
                        name="isActive"
                        type="checkbox"
                        defaultChecked={question.isActive}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      Aktifkan soal ini
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <QuestionOptionPreview label="A" text={question.optionA} />
                    <QuestionOptionPreview label="B" text={question.optionB} />
                    <QuestionOptionPreview label="C" text={question.optionC} />
                    <QuestionOptionPreview label="D" text={question.optionD} />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <LoadingSubmitButton
                      idleLabel="Perbarui Soal"
                      pendingLabel="Menyimpan..."
                      loadingMessage="Memperbarui bank soal..."
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

function OptionInput({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string;
  label: string;
  name: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <textarea
        name={name}
        rows={2}
        defaultValue={defaultValue}
        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
        required
      />
    </label>
  );
}

function QuestionOptionPreview({
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
