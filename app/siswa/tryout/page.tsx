import Link from "next/link";
import { TryoutStatus } from "@prisma/client";

import { StartTryoutButton } from "@/app/siswa/tryout/_start-tryout-button";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isFeedbackComplete } from "@/lib/student-feedback";

export default async function SiswaTryoutPage() {
  const session = await getCurrentSession();
  const studentUserId = session?.user.id ?? "";

  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: studentUserId,
    },
    select: {
      id: true,
    },
  });

  const [availableTryouts, completedSessions] = await Promise.all([
    prisma.tryout.findMany({
      where: {
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
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
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
    studentProfile
      ? prisma.tryoutSession.findMany({
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
            tryoutId: true,
            score: true,
            submittedAt: true,
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
      : [],
  ]);

  const latestSessionByTryout = new Map<string, (typeof completedSessions)[number]>();

  for (const tryoutSession of completedSessions) {
    if (!latestSessionByTryout.has(tryoutSession.tryoutId)) {
      latestSessionByTryout.set(tryoutSession.tryoutId, tryoutSession);
    }
  }

  const pendingFeedbackCount = Array.from(latestSessionByTryout.values()).filter(
    (sessionItem) => !isFeedbackComplete(sessionItem.feedbacks),
  ).length;

  const completedTryoutCount = latestSessionByTryout.size;

  const tryoutItems = availableTryouts.map((tryout) => {
    const latestSession = latestSessionByTryout.get(tryout.id);
    const needsFeedback = latestSession ? !isFeedbackComplete(latestSession.feedbacks) : false;
    const status: "Belum Dikerjakan" | "Perlu Tanggapan" | "Selesai" = latestSession
      ? needsFeedback
        ? "Perlu Tanggapan"
        : "Selesai"
      : "Belum Dikerjakan";

    return {
      ...tryout,
      latestSession,
      status,
    };
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Aktivitas Belajar
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Tryout
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Pilih tryout yang tersedia, lanjutkan latihanmu, lalu tinjau kembali hasil yang sudah
            kamu kerjakan.
          </p>
        </div>

        {/* <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/siswa"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Kembali ke Dashboard
          </Link>
        </div> */}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <TryoutStatCard
          accent="blue"
          helper="Paket tryout aktif yang bisa langsung kamu buka."
          label="Tryout Tersedia"
          value={String(availableTryouts.length)}
        />
        <TryoutStatCard
          accent="emerald"
          helper="Tryout yang sudah kamu selesaikan dan tercatat hasilnya."
          label="Selesai Dikerjakan"
          value={String(completedTryoutCount)}
        />
        <TryoutStatCard
          accent="orange"
          helper="Cek kembali tryout yang masih menunggu umpan balik pembelajaran."
          label="Menunggu Tanggapan"
          value={String(pendingFeedbackCount)}
        />
      </section>

      <section className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Daftar Tryout
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Urutkan fokusmu dari tryout yang belum dikerjakan sampai yang perlu ditindak lanjuti.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              label="Semua"
              count={availableTryouts.length}
              tone="blue"
            />
            <FilterChip
              label="Belum Dikerjakan"
              count={tryoutItems.filter((item) => item.status === "Belum Dikerjakan").length}
            />
            <FilterChip
              label="Selesai"
              count={tryoutItems.filter((item) => item.status === "Selesai").length}
            />
            <FilterChip
              label="Perlu Tanggapan"
              count={tryoutItems.filter((item) => item.status === "Perlu Tanggapan").length}
              tone="orange"
            />
          </div>
        </div>

        {tryoutItems.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-6 text-sm leading-7 text-slate-500">
            Belum ada tryout yang tersedia untuk ditampilkan saat ini.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {tryoutItems.map((tryout) => (
              <TryoutListCard
                key={tryout.id}
                description={tryout.description}
                durationMinutes={tryout.durationMinutes}
                latestScore={
                  tryout.latestSession?.score !== null && tryout.latestSession?.score !== undefined
                    ? Number(tryout.latestSession.score).toFixed(0)
                    : null
                }
                questionCount={tryout._count.tryoutQuestions}
                pendingSessionId={tryout.latestSession?.id ?? null}
                status={tryout.status}
                subjectName={tryout.subject.name}
                title={tryout.title}
                tryoutId={tryout.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TryoutStatCard({
  accent,
  helper,
  label,
  value,
}: {
  accent: "blue" | "emerald" | "orange";
  helper: string;
  label: string;
  value: string;
}) {
  const accentClass =
    accent === "orange"
      ? "bg-orange-100 text-orange-700"
      : accent === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-[1.6rem] border border-white/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}>
          <TryoutMetricIcon />
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accentClass}`}>
          Overview
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function FilterChip({
  count,
  label,
  tone = "slate",
}: {
  count: number;
  label: string;
  tone?: "blue" | "orange" | "slate";
}) {
  const toneClass =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${toneClass}`}
    >
      {label}
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] tracking-normal">
        {count}
      </span>
    </span>
  );
}

function TryoutListCard({
  description,
  durationMinutes,
  latestScore,
  pendingSessionId,
  questionCount,
  status,
  subjectName,
  title,
  tryoutId,
}: {
  description: string | null;
  durationMinutes: number | null;
  latestScore: string | null;
  pendingSessionId: string | null;
  questionCount: number;
  status: "Belum Dikerjakan" | "Perlu Tanggapan" | "Selesai";
  subjectName: string;
  title: string;
  tryoutId: string;
}) {
  const statusClass =
    status === "Selesai"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Perlu Tanggapan"
        ? "bg-orange-100 text-orange-700"
        : "bg-blue-100 text-blue-700";
  const primaryCta =
    status === "Perlu Tanggapan"
      ? {
          href: pendingSessionId
            ? `/siswa/tanggapan?session=${pendingSessionId}#form-tanggapan`
            : "/siswa/tanggapan",
          label: "Isi Tanggapan",
        }
      : status === "Selesai"
        ? {
            href: `/siswa/tryout/${tryoutId}`,
            label: "Lihat Hasil",
          }
        : null;

  return (
    <article className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          {subjectName}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {status}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          {description?.trim() ||
            `${questionCount} soal siap dikerjakan untuk menguatkan pemahamanmu pada sesi ini.`}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <TryoutMetaItem label="Jumlah Soal" value={`${questionCount} soal`} />
        <TryoutMetaItem
          label="Durasi"
          value={durationMinutes ? `${durationMinutes} menit` : "Fleksibel"}
        />
        <TryoutMetaItem label="Nilai Terakhir" value={latestScore ? latestScore : "-"} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {status === "Belum Dikerjakan" ? (
          <>
            <StartTryoutButton
              href={`/siswa/tryout/${tryoutId}/kerjakan`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <Link
              href={`/siswa/tryout/${tryoutId}`}
              className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Ringkasan
            </Link>
          </>
        ) : (
          <>
            <Link
              href={primaryCta?.href ?? `/siswa/tryout/${tryoutId}`}
              className="inline-flex h-11 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500"
            >
              {primaryCta?.label ?? "Lihat Detail"}
            </Link>
            <Link
              href={`/siswa/tryout/${tryoutId}`}
              className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Detail
            </Link>
          </>
        )}
        <span className="text-sm text-slate-500">
          {status === "Perlu Tanggapan"
            ? "Isi umpan balik pembelajaran dulu agar evaluasi belajarmu lebih lengkap, lalu kamu tetap bisa membuka detail tryout."
            : status === "Selesai"
              ? "Hasil terbaru sudah tersimpan dan siap kamu tinjau kembali."
              : "Tryout ini siap kamu mulai kapan saja."}
        </span>
      </div>
    </article>
  );
}

function TryoutMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TryoutMetricIcon() {
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
      <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M7.5 10.5h9" />
      <path d="M7.5 14.5h5" />
    </svg>
  );
}
