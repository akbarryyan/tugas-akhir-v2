import Link from "next/link";
import { Prisma } from "@prisma/client";

import {
  AdminEmptyState,
  PageIntro,
  SectionCard,
} from "@/app/admin/_components";
import { prisma } from "@/lib/db/prisma";

export default async function AdminTryoutPage() {
  const [tryoutCount, publishedCount, draftCount, recentTryouts] =
    await Promise.all([
      prisma.tryout.count(),
      prisma.tryout.count({
        where: {
          isPublished: true,
        },
      }),
      prisma.tryout.count({
        where: {
          isPublished: false,
        },
      }),
      prisma.tryout.findMany({
        include: {
          subject: {
            select: {
              name: true,
            },
          },
          createdByTeacher: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
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
        take: 8,
      }),
    ]);

  const tryoutRows: Prisma.TryoutGetPayload<{
    include: {
      subject: {
        select: {
          name: true;
        };
      };
      createdByTeacher: {
        include: {
          user: {
            select: {
              name: true;
            };
          };
        };
      };
      _count: {
        select: {
          sessions: true;
          tryoutQuestions: true;
        };
      };
    };
  }>[] = recentTryouts;

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Administrasi Tryout"
        title="Pemantauan Paket Tryout"
        description="Pantau jumlah tryout yang sudah disusun oleh guru, status publikasinya, serta keterhubungan paket tryout dengan mata pelajaran dan aktivitas siswa."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <TryoutSummaryCard
          accent="indigo"
          label="Total Tryout"
          value={tryoutCount}
          description="Jumlah seluruh paket tryout yang sudah terdaftar di sistem."
        />
        <TryoutSummaryCard
          accent="emerald"
          label="Sudah Dipublikasikan"
          value={publishedCount}
          description="Tryout yang sudah bisa dilihat dan dikerjakan oleh siswa."
        />
        <TryoutSummaryCard
          accent="amber"
          label="Masih Draft"
          value={draftCount}
          description="Tryout yang masih perlu dilengkapi atau diperiksa sebelum dipublikasikan."
        />
      </section>

      <SectionCard
        title="Tryout Terbaru"
        description="Gunakan daftar ini untuk meninjau paket tryout yang baru dibuat dan memastikan struktur datanya sudah siap dipakai."
      >
        {tryoutRows.length === 0 ? (
          <AdminEmptyState message="Belum ada paket tryout yang dibuat di sistem." />
        ) : (
          <div className="grid gap-4">
            {tryoutRows.map((tryout) => (
              <article
                key={tryout.id}
                className="rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5"
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
                    <h2 className="text-xl font-semibold text-slate-950">
                      {tryout.title}
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {tryout.description?.trim()
                        ? tryout.description
                        : "Paket tryout ini belum memiliki deskripsi tambahan."}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 lg:min-w-[350px]">
                    <InfoPill
                      label="Penyusun"
                      value={tryout.createdByTeacher?.user.name ?? "Belum ditetapkan"}
                    />
                    <InfoPill
                      label="Soal"
                      value={`${tryout._count.tryoutQuestions} soal`}
                    />
                    <InfoPill
                      label="Sesi Siswa"
                      value={`${tryout._count.sessions} sesi`}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
          Pembuatan tryout dilakukan melalui area guru agar penyusunan paket soal tetap mengikuti mata pelajaran yang diampu.
          <Link href="/guru/tryout" className="ml-2 font-semibold text-indigo-600 hover:text-indigo-700">
            Lihat rancangan modul guru
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}

function TryoutSummaryCard({
  accent,
  description,
  label,
  value,
}: {
  accent: "amber" | "emerald" | "indigo";
  description: string;
  label: string;
  value: number;
}) {
  const accentClasses =
    accent === "indigo"
      ? "bg-indigo-100 text-indigo-700"
      : accent === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="rounded-[1rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`rounded-[0.85rem] px-3 py-2 text-xs font-semibold ${accentClasses}`}>
          Aktif
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.95rem] border border-slate-200/80 bg-white px-3.5 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
