import Link from "next/link";

import { PageIntro, SectionCard, StatusAlert } from "@/app/admin/_components";
import {
  ConfirmActionButton,
  ConfirmDeleteButton,
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import {
  deleteTryoutAction,
  toggleTryoutPublishAction,
  updateTryoutAction,
} from "@/app/guru/tryout/_actions";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type GuruTryoutDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function GuruTryoutDetailPage({
  params,
  searchParams,
}: GuruTryoutDetailPageProps) {
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

  const tryout = teacherId
    ? await prisma.tryout.findFirst({
        where: {
          createdByTeacherId: teacherId,
          id,
        },
        include: {
          bankSoal: {
            select: {
              title: true,
            },
          },
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

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Informasi Paket"
          description="Ringkasan utama tryout yang sedang Anda kelola."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailInfoCard label="Mata Pelajaran" value={tryout.subject.name} />
            <DetailInfoCard
              label="Bank Soal"
              value={tryout.bankSoal?.title ?? "Belum terhubung ke bank soal"}
            />
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

            <form action={toggleTryoutPublishAction}>
              <input type="hidden" name="tryoutId" value={tryout.id} />
              <input type="hidden" name="redirectTo" value={`/guru/tryout/${tryout.id}`} />
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
                confirmTitle={tryout.isPublished ? "Ubah Menjadi Draft" : "Publikasikan Tryout"}
                className={`inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition ${
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
              <input type="hidden" name="redirectTo" value="/guru/tryout" />
              <ConfirmDeleteButton
                confirmTitle="Hapus Paket Tryout"
                confirmMessage="Paket tryout ini akan dihapus beserta relasi soalnya."
                className="inline-flex h-11 items-center rounded-full border border-rose-200 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Hapus
              </ConfirmDeleteButton>
            </form>
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
        title="Perbarui Tryout"
        description="Edit metadata dan susunan soal agar paket tryout tetap sesuai dengan kebutuhan pembelajaran."
      >
        <form action={updateTryoutAction} className="grid gap-5">
          <input type="hidden" name="tryoutId" value={tryout.id} />
          <input type="hidden" name="redirectTo" value={`/guru/tryout/${tryout.id}`} />

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
              Bank Soal
              <select
                name="bankSoalId"
                defaultValue={tryout.bankSoalId ?? ""}
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              >
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

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Perbarui Susunan Soal</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Centang ulang soal yang ingin dipertahankan dari bank soal yang relevan untuk tryout ini.
              </p>
            </div>

            <QuestionPicker
              bankSoals={bankSoalOptions}
              selectedQuestionIds={tryout.tryoutQuestions.map((item) => item.questionId)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <LoadingSubmitButton
              idleLabel="Perbarui Tryout"
              pendingLabel="Menyimpan..."
              loadingMessage="Memperbarui paket tryout..."
              className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </form>
      </SectionCard>

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
          <div>
            <h4 className="text-base font-semibold text-slate-950">{bankSoal.title}</h4>
            <p className="text-sm leading-6 text-slate-600">
              {bankSoal.subject.name} • {bankSoal.bankSoalQuestions.length} soal tersusun di bank soal ini.
            </p>
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
                    <span className="mt-1 block leading-6">{item.question.questionText}</span>
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
