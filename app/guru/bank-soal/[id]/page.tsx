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
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import {
  deleteBankSoalAction,
  toggleBankSoalStatusAction,
  updateBankSoalAction,
} from "@/app/guru/bank-soal/_actions";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type GuruBankSoalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function GuruBankSoalDetailPage({
  params,
  searchParams,
}: GuruBankSoalDetailPageProps) {
  const session = await getCurrentSession();
  const teacherUserId = session?.user.id ?? "";
  const { id } = await params;
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

  const bankSoal = teacherId
    ? await prisma.bankSoal.findFirst({
        where: {
          createdByTeacherId: teacherId,
          id,
        },
        include: {
          subject: {
            select: {
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
                  questionText: true,
                },
              },
            },
          },
          _count: {
            select: {
              tryouts: true,
            },
          },
        },
      })
    : null;

  if (!bankSoal) {
    return (
      <div className="space-y-6">
        <PageIntro
          eyebrow="Detail Bank Soal"
          title="Bank soal tidak ditemukan"
          description="Bank soal ini belum tersedia atau tidak termasuk dalam data yang Anda susun."
        />
        <SectionCard
          title="Kembali ke Modul Bank Soal"
          description="Buka lagi daftar bank soal untuk memilih koleksi yang ingin Anda lihat atau kelola."
        >
          <Link
            href="/guru/bank-soal"
            className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Kembali ke Daftar Bank Soal
          </Link>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Detail Bank Soal"
        title={bankSoal.title}
        description="Tinjau komposisi soal, perbarui metadata, dan atur status aktif bank soal sebelum digunakan untuk menyusun tryout."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Informasi Bank Soal"
          description="Ringkasan utama bank soal yang sedang Anda kelola."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailInfoCard label="Mata Pelajaran" value={bankSoal.subject.name} />
            <DetailInfoCard
              label="Status"
              value={bankSoal.isActive ? "Aktif" : "Nonaktif"}
            />
            <DetailInfoCard
              label="Jumlah Soal"
              value={`${bankSoal.bankSoalQuestions.length} soal`}
            />
            <DetailInfoCard
              label="Dipakai pada Tryout"
              value={`${bankSoal._count.tryouts} tryout`}
            />
            <DetailInfoCard
              label="Deskripsi"
              value={bankSoal.description?.trim() || "Belum ada deskripsi bank soal."}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/guru/bank-soal"
              className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kembali ke Daftar Bank Soal
            </Link>

            <form action={toggleBankSoalStatusAction}>
              <input type="hidden" name="bankSoalId" value={bankSoal.id} />
              <input type="hidden" name="isActive" value={bankSoal.isActive ? "false" : "true"} />
              <ConfirmActionButton
                confirmLabel={bankSoal.isActive ? "Ya, nonaktifkan" : "Ya, aktifkan"}
                confirmMessage={
                  bankSoal.isActive
                    ? "Bank soal ini akan dinonaktifkan dan tidak dapat dipakai untuk menyusun tryout baru."
                    : "Bank soal ini akan diaktifkan kembali dan dapat dipakai untuk tryout."
                }
                confirmTitle={
                  bankSoal.isActive ? "Nonaktifkan Bank Soal" : "Aktifkan Bank Soal"
                }
                className={`inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition ${
                  bankSoal.isActive
                    ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {bankSoal.isActive ? "Nonaktifkan" : "Aktifkan"}
              </ConfirmActionButton>
            </form>

            <form action={deleteBankSoalAction}>
              <input type="hidden" name="bankSoalId" value={bankSoal.id} />
              <ConfirmDeleteButton
                confirmTitle="Hapus Bank Soal"
                confirmMessage="Bank soal ini akan dihapus beserta relasi soalnya."
                className="inline-flex h-11 items-center rounded-full border border-rose-200 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Hapus
              </ConfirmDeleteButton>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          title="Susunan Soal Saat Ini"
          description="Urutan berikut menunjukkan soal-soal yang sudah masuk ke bank soal ini."
        >
          {bankSoal.bankSoalQuestions.length === 0 ? (
            <AdminEmptyState message="Belum ada soal yang dimasukkan ke bank soal ini." />
          ) : (
            <div className="grid gap-3">
              {bankSoal.bankSoalQuestions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Soal {item.orderNumber}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {item.question.questionText}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Perbarui Bank Soal"
        description="Edit metadata dan susunan soal untuk menyesuaikan bank soal dengan kebutuhan tryout."
      >
        <form action={updateBankSoalAction} className="grid gap-5">
          <input type="hidden" name="bankSoalId" value={bankSoal.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nama Bank Soal
              <input
                name="title"
                type="text"
                defaultValue={bankSoal.title}
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Mata Pelajaran
              <select
                name="subjectId"
                defaultValue={bankSoal.subjectId}
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
              Deskripsi
              <textarea
                name="description"
                rows={3}
                defaultValue={bankSoal.description ?? ""}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
              />
            </label>

            <label className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 lg:col-span-2">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={bankSoal.isActive}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Aktifkan bank soal ini
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Perbarui Susunan Soal</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Centang ulang soal-soal yang ingin dipertahankan di dalam bank soal ini.
              </p>
            </div>

            <QuestionPicker
              selectedQuestionIds={bankSoal.bankSoalQuestions.map((item) => item.questionId)}
              subjects={subjectOptions}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <LoadingSubmitButton
              idleLabel="Perbarui Bank Soal"
              pendingLabel="Menyimpan..."
              loadingMessage="Memperbarui bank soal..."
              className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </form>
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
