import Link from "next/link";
import { TryoutStatus } from "@prisma/client";

import { StatusAlert } from "@/app/admin/_components";
import { StartTryoutButton } from "@/app/siswa/tryout/_start-tryout-button";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  REQUIRED_FEEDBACK_ASPECT_COUNT,
  getFeedbackCompletionCount,
  isFeedbackComplete,
} from "@/lib/student-feedback";

type SiswaTryoutDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function SiswaTryoutDetailPage({
  params,
  searchParams,
}: SiswaTryoutDetailPageProps) {
  const session = await getCurrentSession();
  const studentUserId = session?.user.id ?? "";
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: studentUserId,
    },
    select: {
      id: true,
    },
  });

  const tryout = await prisma.tryout.findFirst({
    where: {
      id,
      isPublished: true,
      subject: {
        isActive: true,
      },
      tryoutQuestions: {
        some: {
          question: {
            isActive: true,
          },
        },
      },
    },
    include: {
      subject: {
        select: {
          name: true,
        },
      },
      tryoutQuestions: {
        where: {
          question: {
            isActive: true,
          },
        },
        orderBy: {
          orderNumber: "asc",
        },
        include: {
          question: {
            select: {
              correctOption: true,
              explanation: true,
              id: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              questionText: true,
            },
          },
        },
      },
    },
  });

  const latestSession =
    studentProfile && tryout
      ? await prisma.tryoutSession.findFirst({
          where: {
            studentId: studentProfile.id,
            tryoutId: tryout.id,
            status: {
              in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
            },
          },
          include: {
            answers: {
              select: {
                questionId: true,
                selectedOption: true,
                isCorrect: true,
              },
            },
            feedbacks: {
              select: {
                aspect: true,
              },
            },
          },
          orderBy: [
            {
              submittedAt: "desc",
            },
            {
              updatedAt: "desc",
            },
          ],
        })
      : null;

  if (!tryout) {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            Detail Tryout
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Tryout belum tersedia
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Tryout yang kamu buka belum dipublikasikan atau sudah tidak tersedia lagi.
          </p>
          <Link
            href="/siswa/tryout"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Kembali ke Daftar Tryout
          </Link>
        </section>
      </div>
    );
  }

  if (!studentProfile) {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            Detail Tryout
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Profil siswa belum siap
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Lengkapi atau sinkronkan profil siswa terlebih dahulu agar tryout bisa dikerjakan
            dengan aman dan hasilnya tercatat pada akunmu.
          </p>
          <Link
            href="/siswa/pengaturan"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Buka Pengaturan Profil
          </Link>
        </section>
      </div>
    );
  }

  const answerMap = new Map(
    latestSession?.answers.map((answer) => [answer.questionId, answer]) ?? [],
  );
  const feedbackCompletionCount = latestSession
    ? getFeedbackCompletionCount(latestSession.feedbacks)
    : 0;
  const hasCompleteFeedback = latestSession
    ? isFeedbackComplete(latestSession.feedbacks)
    : false;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef8ff_48%,#f8fdff_100%)] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                {tryout.subject.name}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-slate-500">
                {tryout.tryoutQuestions.length} soal
              </span>
              {tryout.durationMinutes ? (
                <span className="rounded-full bg-white px-3 py-1 text-slate-500">
                  {tryout.durationMinutes} menit
                </span>
              ) : null}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {tryout.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {tryout.description?.trim() ||
                  "Kerjakan tryout ini dengan fokus, lalu kirim semua jawaban saat sudah selesai."}
              </p>
            </div>
          </div>

          <Link
            href="/siswa/tryout"
            className="inline-flex h-11 items-center rounded-full border border-sky-200 bg-white px-5 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Kembali ke Daftar Tryout
          </Link>
        </div>
      </section>

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      {latestSession ? (
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StudentSummaryCard
              label="Nilai Akhir"
              value={Number(latestSession.score ?? 0).toFixed(0)}
              description="Hasil tryout terbaru yang sudah kamu kirim."
            />
            <StudentSummaryCard
              label="Jawaban Benar"
              value={`${latestSession.correctAnswers}/${latestSession.totalQuestions}`}
              description="Jumlah soal yang berhasil kamu jawab dengan tepat."
            />
            <StudentSummaryCard
              label="Status"
              value={latestSession.status === TryoutStatus.GRADED ? "Dinilai" : "Terkirim"}
              description="Hasil terbaru sudah tercatat pada sistem."
            />
            <StudentSummaryCard
              label="Tanggapan"
              value={`${feedbackCompletionCount}/${REQUIRED_FEEDBACK_ASPECT_COUNT} aspek`}
              description={
                hasCompleteFeedback
                  ? "Tanggapan belajar untuk tryout ini sudah lengkap."
                  : "Masih ada aspek tanggapan yang perlu kamu lengkapi."
              }
            />
          </div>

          {!hasCompleteFeedback ? (
            <section className="rounded-[1.6rem] border border-orange-200 bg-orange-50/70 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                    Tindak Lanjut
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    Lengkapi tanggapan belajarmu
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Agar evaluasi tryout ini utuh, isi seluruh aspek tanggapan
                    materi, penyampaian, dan soal pada halaman tanggapan.
                  </p>
                </div>
                <Link
                  href={`/siswa/tanggapan?session=${latestSession.id}#form-tanggapan`}
                  className="inline-flex h-11 items-center rounded-full bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-400"
                >
                  Isi Tanggapan Sekarang
                </Link>
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Review Jawaban
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Tinjau hasil tryout terakhirmu
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Jawaban berikut menampilkan pilihan yang kamu kirim pada sesi terbaru.
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              {tryout.tryoutQuestions.map((item) => {
                const answer = answerMap.get(item.questionId);

                return (
                  <article
                    key={item.id}
                    className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Soal {item.orderNumber}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          answer?.isCorrect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {answer?.isCorrect ? "Jawaban benar" : "Perlu ditinjau lagi"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-800">
                      {item.question.questionText}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {(
                        [
                          ["A", item.question.optionA],
                          ["B", item.question.optionB],
                          ["C", item.question.optionC],
                          ["D", item.question.optionD],
                        ] as const
                      ).map(([option, text]) => (
                        <ResultOptionCard
                          key={option}
                          isCorrectOption={item.question.correctOption === option}
                          isSelected={answer?.selectedOption === option}
                          label={option}
                          text={text}
                        />
                      ))}
                    </div>

                    {item.question.explanation?.trim() ? (
                      <div className="mt-4 rounded-[1.35rem] border border-sky-100 bg-sky-50/80 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                          Catatan Pembahasan
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {item.question.explanation}
                        </p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <StudentSummaryCard
              label="Jumlah Soal"
              value={String(tryout.tryoutQuestions.length)}
              description="Semua soal aktif yang akan muncul pada mode ujian."
            />
            <StudentSummaryCard
              label="Durasi"
              value={tryout.durationMinutes ? `${tryout.durationMinutes} mnt` : "Fleksibel"}
              description="Gunakan alokasi waktu ini sebagai panduan saat mengerjakan."
            />
            <StudentSummaryCard
              label="Status"
              value="Siap Dikerjakan"
              description="Tryout belum pernah kamu kirim dan siap dimulai sekarang."
            />
          </div>

          <section className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Ringkasan Pengerjaan
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Masuk ke mode ujian saat kamu sudah siap
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Mode ujian akan ditampilkan dalam halaman penuh tanpa sidebar dashboard siswa.
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Yang Perlu Kamu Siapkan
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <li>Pastikan koneksi dan perangkatmu stabil sebelum mulai mengerjakan.</li>
                  <li>Kerjakan semua soal sampai selesai karena tryout ini tidak mendukung retake.</li>
                  <li>Setelah jawaban dikirim, hasil langsung disimpan dan bisa ditinjau kembali.</li>
                </ul>
              </article>

              <article className="rounded-[1.6rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                  Mulai Tryout
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">
                  Siap fokus mengerjakan?
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Klik tombol di bawah untuk membuka mode ujian penuh dan mulai mengerjakan soal.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <StartTryoutButton
                    href={`/siswa/tryout/${tryout.id}/kerjakan`}
                    idleLabel="Mulai Tryout"
                    pendingLabel="Menyiapkan..."
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                  <Link
                    href="/siswa/tryout"
                    className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Kembali
                  </Link>
                </div>
              </article>
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

function StudentSummaryCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function ResultOptionCard({
  isCorrectOption,
  isSelected,
  label,
  text,
}: {
  isCorrectOption: boolean;
  isSelected: boolean;
  label: string;
  text: string;
}) {
  const accentClass = isCorrectOption
    ? "border-emerald-200 bg-emerald-50/70"
    : isSelected
      ? "border-amber-200 bg-amber-50/70"
      : "border-slate-200/80 bg-white";

  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 ${accentClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Opsi {label}
        </p>
        {isCorrectOption ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Kunci
          </span>
        ) : null}
        {isSelected ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            Pilihanmu
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}
