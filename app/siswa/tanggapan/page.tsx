import Link from "next/link";
import { LearningAspect, SentimentLabel, TryoutStatus } from "@prisma/client";

import { StatusAlert } from "@/app/admin/_components";
import { submitStudentFeedbackAction } from "@/app/siswa/tanggapan/_actions";
import { SubmitFeedbackButton } from "@/app/siswa/tanggapan/_submit-feedback-button";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  REQUIRED_FEEDBACK_ASPECT_COUNT,
  REQUIRED_FEEDBACK_ASPECTS,
  feedbackAspectLabelMap,
  getFeedbackCompletionCount,
  getMissingFeedbackAspects,
  isFeedbackComplete,
} from "@/lib/student-feedback";

type SiswaTanggapanPageProps = {
  searchParams?: Promise<{
    message?: string;
    session?: string;
    type?: string;
  }>;
};

export default async function SiswaTanggapanPage({
  searchParams,
}: SiswaTanggapanPageProps) {
  const session = await getCurrentSession();
  const studentUserId = session?.user.id ?? "";
  const resolvedSearchParams = await searchParams;
  const selectedSessionId = resolvedSearchParams?.session?.trim() ?? "";

  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: studentUserId,
    },
    select: {
      id: true,
    },
  });

  const [completedSessions, feedbackSessions] = studentProfile
    ? await Promise.all([
        prisma.tryoutSession.findMany({
          where: {
            studentId: studentProfile.id,
            status: {
              in: [TryoutStatus.SUBMITTED, TryoutStatus.GRADED],
            },
            tryout: {
              isPublished: true,
              subject: {
                isActive: true,
              },
            },
          },
          select: {
            id: true,
            submittedAt: true,
            status: true,
            feedbacks: {
              select: {
                aspect: true,
                comment: true,
              },
            },
            tryout: {
              select: {
                id: true,
                title: true,
                subject: {
                  select: {
                    name: true,
                  },
                },
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
        }),
        prisma.tryoutSession.findMany({
          where: {
            studentId: studentProfile.id,
            feedbacks: { some: {} },
          },
          select: {
            id: true,
            submittedAt: true,
            score: true,
            tryout: {
              select: {
                id: true,
                title: true,
                subject: {
                  select: { name: true },
                },
              },
            },
            feedbacks: {
              select: {
                aspect: true,
                comment: true,
                sentiment: {
                  select: { finalLabel: true },
                },
              },
              orderBy: { aspect: "asc" },
            },
          },
          orderBy: { submittedAt: "desc" },
          take: 8,
        }),
      ])
    : [[], []];

  const pendingSessions = completedSessions.filter(
    (sessionItem) => !isFeedbackComplete(sessionItem.feedbacks),
  );
  const selectedPendingSession =
    pendingSessions.find((sessionItem) => sessionItem.id === selectedSessionId) ??
    pendingSessions[0] ??
    null;
  const sentimentReadyCount = feedbackSessions.reduce(
    (count, s) => count + s.feedbacks.filter((f) => f.sentiment).length,
    0,
  );
  const completedFeedbackSessionCount = completedSessions.filter((sessionItem) =>
    isFeedbackComplete(sessionItem.feedbacks),
  ).length;

  const defaultCommentsByAspect = Object.fromEntries(
    REQUIRED_FEEDBACK_ASPECTS.map((aspect) => [
      aspect,
      selectedPendingSession?.feedbacks.find((item) => item.aspect === aspect)?.comment ?? "",
    ]),
  ) as Record<LearningAspect, string>;

  return (
    <div className="space-y-5">
      <section>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Aktivitas Belajar
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Tanggapan
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Setelah menyelesaikan tryout, lengkapi umpan balik tentang proses pembelajaran pada
            mata pelajaran ini melalui tiga aspek utama: materi, penyampaian, dan evaluasi
            belajar. Dengan begitu, tindak lanjut pembelajaran di kelas bisa dipahami lebih utuh.
          </p>
        </div>
      </section>

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-4 xl:grid-cols-4">
        <FeedbackSummaryCard
          helper="Tryout yang masih perlu dilengkapi seluruh aspek tanggapannya."
          label="Perlu Tanggapan"
          tone="orange"
          value={String(pendingSessions.length)}
        />
        <FeedbackSummaryCard
          helper="Jumlah sesi tryout yang seluruh aspek feedback-nya sudah lengkap."
          label="Tanggapan Lengkap"
          tone="emerald"
          value={String(completedFeedbackSessionCount)}
        />
        <FeedbackSummaryCard
          helper="Jumlah tryout yang sudah kamu beri tanggapan lengkap."
          label="Riwayat Tryout"
          tone="blue"
          value={String(feedbackSessions.length)}
        />
        <FeedbackSummaryCard
          helper="Feedback yang sudah punya hasil analisis sentimen."
          label="Analisis Sentimen"
          tone="violet"
          value={String(sentimentReadyCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Sesi yang Perlu Ditindak Lanjuti
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pilih sesi tryout yang ingin kamu gunakan untuk mengirim umpan balik tentang
                pembelajaran pada mata pelajaran terkait. Status lengkap dihitung jika ketiga
                aspek utama sudah terisi.
              </p>
            </div>
            <Link
              href="/siswa/hasil"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Buka Hasil
            </Link>
          </div>

          {pendingSessions.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-emerald-200 bg-emerald-50/60 px-5 py-6 text-sm leading-7 text-emerald-800">
              Semua sesi tryout yang selesai sudah memiliki umpan balik pembelajaran yang lengkap.
              Kamu bisa lanjut mengerjakan tryout lain atau meninjau riwayat tanggapan di bawah.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {pendingSessions.map((sessionItem) => (
                <PendingFeedbackTryoutCard
                  key={sessionItem.id}
                  completionCount={getFeedbackCompletionCount(sessionItem.feedbacks)}
                  isActive={selectedPendingSession?.id === sessionItem.id}
                  missingAspects={getMissingFeedbackAspects(sessionItem.feedbacks)}
                  selectedSessionId={selectedPendingSession?.id ?? null}
                  sessionId={sessionItem.id}
                  subjectName={sessionItem.tryout.subject.name}
                  submittedAt={sessionItem.submittedAt}
                  title={sessionItem.tryout.title}
                  tryoutId={sessionItem.tryout.id}
                />
              ))}
            </div>
          )}
        </section>

        <section
          id="form-tanggapan"
          className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]"
        >
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Form Tanggapan Belajar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Isi seluruh aspek agar umpan balik tentang proses pembelajaran tersimpan lengkap dan
              mudah ditindak lanjuti.
            </p>
          </div>

          {!selectedPendingSession ? (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
              Tidak ada sesi yang perlu diisi saat ini. Setelah menyelesaikan tryout baru, form
              umpan balik pembelajaran akan muncul otomatis di sini.
            </div>
          ) : (
            <form action={submitStudentFeedbackAction} className="mt-5 space-y-5">
              <input
                type="hidden"
                name="tryoutSessionId"
                value={selectedPendingSession.id}
              />

              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                      Sesi Dipilih
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      {selectedPendingSession.tryout.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedPendingSession.tryout.subject.name} • selesai dikerjakan{" "}
                      {selectedPendingSession.submittedAt
                        ? formatDateTime(selectedPendingSession.submittedAt)
                        : "baru-baru ini"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                      {getFeedbackCompletionCount(selectedPendingSession.feedbacks)}/
                      {REQUIRED_FEEDBACK_ASPECT_COUNT} aspek terisi
                    </span>
                    <Link
                      href={`/siswa/tryout/${selectedPendingSession.tryout.id}`}
                      className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    >
                      Lihat Detail Tryout
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <FeedbackTextareaField
                  name="materi"
                  title="Materi"
                  description="Ceritakan apakah materi pelajaran yang disampaikan di kelas terasa jelas, relevan, dan membantu pemahamanmu."
                  placeholder="Contoh: Materi yang diajarkan sudah cukup jelas, tetapi ada beberapa topik yang menurut saya perlu dijelaskan lebih perlahan..."
                  defaultValue={defaultCommentsByAspect[LearningAspect.MATERI]}
                />
                <FeedbackTextareaField
                  name="penyampaian"
                  title="Penyampaian"
                  description="Jelaskan bagaimana cara guru menyampaikan materi, menjawab pertanyaan, dan membangun suasana belajar di kelas."
                  placeholder="Contoh: Cara penyampaiannya mudah dipahami, tetapi saya akan lebih terbantu jika ada lebih banyak contoh saat penjelasan..."
                  defaultValue={defaultCommentsByAspect[LearningAspect.PENYAMPAIAN]}
                />
                <FeedbackTextareaField
                  name="soal"
                  title="Evaluasi"
                  description="Berikan tanggapan tentang tugas, latihan, kuis, atau bentuk evaluasi yang diberikan untuk mengukur pemahamanmu."
                  placeholder="Contoh: Latihan dan tugas yang diberikan cukup membantu, tetapi saya berharap ada pembahasan yang lebih rinci setelah evaluasi..."
                  defaultValue={defaultCommentsByAspect[LearningAspect.SOAL]}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <SubmitFeedbackButton />
                <span className="text-sm text-slate-500">
                  Setelah tersimpan, sesi ini akan tercatat sebagai umpan balik pembelajaran yang
                  lengkap.
                </span>
              </div>
            </form>
          )}
        </section>
      </section>

      <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200/80 pb-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            Riwayat Tanggapan Terkirim
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan semua umpan balik pembelajaran yang sudah kamu kirim setelah tryout
            sebelumnya.
          </p>
        </div>

        {feedbackSessions.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
            Belum ada tanggapan yang tersimpan.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {feedbackSessions.map((sessionItem) => (
              <FeedbackSessionHistoryCard key={sessionItem.id} session={sessionItem} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FeedbackSummaryCard({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: "blue" | "emerald" | "orange" | "violet";
  value: string;
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-100 text-orange-700"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : tone === "violet"
          ? "bg-violet-100 text-violet-700"
          : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <FeedbackMetricIcon />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
          Ringkasan
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function PendingFeedbackTryoutCard({
  completionCount,
  isActive,
  missingAspects,
  selectedSessionId,
  sessionId,
  subjectName,
  submittedAt,
  title,
  tryoutId,
}: {
  completionCount: number;
  isActive: boolean;
  missingAspects: LearningAspect[];
  selectedSessionId: string | null;
  sessionId: string;
  subjectName: string;
  submittedAt: Date | null;
  title: string;
  tryoutId: string;
}) {
  return (
    <article
      className={`rounded-[1.6rem] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] transition ${
        isActive
          ? "border-blue-200 bg-blue-50/60"
          : "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {subjectName}
        </span>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
          {completionCount}/{REQUIRED_FEEDBACK_ASPECT_COUNT} aspek
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">
        Selesai dikerjakan {submittedAt ? formatDate(submittedAt) : "baru-baru ini"}.
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Aspek yang masih perlu diisi:{" "}
        {missingAspects.map((aspect) => feedbackAspectLabelMap[aspect]).join(", ")}.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/siswa/tanggapan?session=${sessionId}#form-tanggapan`}
          className={`inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition ${
            isActive
              ? "bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] hover:bg-blue-500"
              : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          {selectedSessionId === sessionId ? "Sedang Dipilih" : "Isi Tanggapan"}
        </Link>
        <Link
          href={`/siswa/tryout/${tryoutId}`}
          className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Lihat Detail
        </Link>
      </div>
    </article>
  );
}

function FeedbackTextareaField({
  defaultValue,
  description,
  name,
  placeholder,
  title,
}: {
  defaultValue: string;
  description: string;
  name: string;
  placeholder: string;
  title: string;
}) {
  return (
    <label className="grid gap-2 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={5}
        required
        placeholder={placeholder}
        className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

type FeedbackSessionItem = {
  id: string;
  submittedAt: Date | null;
  score: { toNumber(): number } | number | null;
  tryout: {
    id: string;
    title: string;
    subject: { name: string };
  };
  feedbacks: {
    aspect: LearningAspect;
    comment: string;
    sentiment: { finalLabel: SentimentLabel } | null;
  }[];
};

function FeedbackSessionHistoryCard({ session }: { session: FeedbackSessionItem }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            {session.tryout.subject.name}
          </span>
          <h3 className="text-sm font-semibold text-slate-900">{session.tryout.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {session.submittedAt && (
            <span className="text-xs text-slate-400">{formatDate(session.submittedAt)}</span>
          )}
          <Link
            href={`/siswa/tryout/${session.tryout.id}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Lihat Tryout
          </Link>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {session.feedbacks.map((fb) => (
          <div key={fb.aspect} className="flex items-start gap-3 px-5 py-3.5">
            <div className="flex min-w-[110px] items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {feedbackAspectLabelMap[fb.aspect]}
              </span>
              {fb.sentiment ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    fb.sentiment.finalLabel === SentimentLabel.POSITIF
                      ? "bg-emerald-100 text-emerald-700"
                      : fb.sentiment.finalLabel === SentimentLabel.NEGATIF
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {sentimentLabelMap[fb.sentiment.finalLabel]}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  Menunggu
                </span>
              )}
            </div>
            <p className="flex-1 text-sm leading-6 text-slate-600">{fb.comment}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

const sentimentLabelMap: Record<SentimentLabel, string> = {
  [SentimentLabel.POSITIF]: "Positif",
  [SentimentLabel.NEGATIF]: "Negatif",
};

function FeedbackMetricIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M5.5 7.5A2.5 2.5 0 0 1 8 5h8a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 16 15H11l-3.5 3v-3H8A2.5 2.5 0 0 1 5.5 12.5v-5Z" />
      <path d="M9 9.5h6" />
      <path d="M9 12h4" />
    </svg>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
