import Image from "next/image";
import Link from "next/link";
import { TryoutStatus } from "@prisma/client";

import { StatusAlert } from "@/app/admin/_components";
import { ExamHeaderTimer } from "@/app/siswa/tryout/[id]/kerjakan/_exam-header-timer";
import { TryoutExamClient } from "@/app/siswa/tryout/[id]/kerjakan/_tryout-exam-client";
import { submitTryoutAnswersAction } from "@/app/siswa/tryout/_actions";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type SiswaTryoutExamPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function SiswaTryoutExamPage({
  params,
  searchParams,
}: SiswaTryoutExamPageProps) {
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
          select: {
            id: true,
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
      <ExamStateCard
        ctaHref="/siswa/tryout"
        ctaLabel="Kembali ke Daftar Tryout"
        description="Tryout yang ingin kamu kerjakan belum tersedia atau sudah tidak aktif lagi."
        eyebrow="Mode Ujian"
        title="Tryout tidak tersedia"
      />
    );
  }

  if (!studentProfile) {
    return (
      <ExamStateCard
        ctaHref="/siswa/pengaturan"
        ctaLabel="Buka Pengaturan Profil"
        description="Profil siswa perlu dilengkapi lebih dulu agar hasil tryout tersimpan dengan benar."
        eyebrow="Mode Ujian"
        title="Profil siswa belum siap"
      />
    );
  }

  if (latestSession) {
    return (
      <ExamStateCard
        ctaHref={`/siswa/tryout/${tryout.id}`}
        ctaLabel="Lihat Detail Hasil"
        description="Tryout ini sudah pernah kamu kirim. Karena mode tanpa retake aktif, kamu hanya bisa meninjau hasil yang sudah tersimpan."
        eyebrow="Mode Ujian"
        title="Tryout sudah selesai dikerjakan"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf5ff_0%,#f7fbff_100%)] px-0 py-0">
      <div className="flex min-h-screen w-full flex-col bg-white shadow-[0_28px_72px_rgba(15,23,42,0.08)]">
        <header className="border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                  {tryout.subject.name}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {tryout.tryoutQuestions.length} soal
                </span>
                {tryout.durationMinutes ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {tryout.durationMinutes} menit
                  </span>
                ) : null}
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                  Mode Ujian CBT
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
                  {tryout.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Fokus kerjakan soal satu per satu. Setelah dikirim, hasil tryout langsung
                  tersimpan dan tidak bisa dikerjakan ulang.
                </p>
              </div>
            </div>

            <div className="shrink-0 space-y-3">
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <StudentProfileAvatar
                    image={session?.user.image ?? null}
                    name={session?.user.name ?? null}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Peserta Ujian
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {session?.user.name ?? "Siswa"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {session?.user.email ?? "Profil siswa aktif"}
                    </p>
                  </div>
                </div>
              </div>
              <ExamHeaderTimer durationMinutes={tryout.durationMinutes} />
            </div>
          </div>
        </header>

        <div className="px-5 pt-5 sm:px-6">
          <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />
        </div>

        <TryoutExamClient
          durationMinutes={tryout.durationMinutes}
          errorRedirectPath={`/siswa/tryout/${tryout.id}/kerjakan`}
          questions={tryout.tryoutQuestions.map((item) => ({
            id: item.id,
            orderNumber: item.orderNumber,
            question: {
              id: item.question.id,
              optionA: item.question.optionA,
              optionB: item.question.optionB,
              optionC: item.question.optionC,
              optionD: item.question.optionD,
              questionText: item.question.questionText,
            },
          }))}
          subjectName={tryout.subject.name}
          submitAction={submitTryoutAnswersAction}
          successRedirectPath={`/siswa/tryout/${tryout.id}`}
          title={tryout.title}
          tryoutId={tryout.id}
        />
      </div>
    </div>
  );
}

function StudentProfileAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string | null;
}) {
  const initials = (name ?? "Siswa")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "Foto profil siswa"}
        width={44}
        height={44}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#38bdf8_0%,#2563eb_100%)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
      {initials || "S"}
    </div>
  );
}

function ExamStateCard({
  ctaHref,
  ctaLabel,
  description,
  eyebrow,
  title,
}: {
  ctaHref: string;
  ctaLabel: string;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
      <section className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
        <Link
          href={ctaHref}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {ctaLabel}
        </Link>
      </section>
    </div>
  );
}
