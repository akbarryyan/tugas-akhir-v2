import Link from "next/link";

import {
  AdminStatCard,
  PageIntro,
  SectionCard,
} from "@/app/admin/_components";
import { prisma } from "@/lib/db/prisma";

export default async function AdminPage() {
  const [teacherCount, studentCount, subjectCount, assignmentCount, tryoutCount] =
    await Promise.all([
      prisma.teacherProfile.count(),
      prisma.studentProfile.count(),
      prisma.subject.count(),
      prisma.subjectTeacher.count(),
      prisma.tryout.count(),
    ]);
  const summaryRows = [
    {
      href: "/admin/guru",
      label: "Data Guru",
      note: "Kelola akun guru beserta identitas pengajar yang aktif di sistem.",
      total: teacherCount,
      unit: "data",
    },
    {
      href: "/admin/siswa",
      label: "Data Siswa",
      note: "Pantau data siswa dan NISN yang digunakan untuk masuk ke sistem.",
      total: studentCount,
      unit: "data",
    },
    {
      href: "/admin/mapel",
      label: "Mata Pelajaran",
      note: "Tinjau daftar mata pelajaran yang dipakai pada tryout dan evaluasi.",
      total: subjectCount,
      unit: "mapel",
    },
    {
      href: "/admin/pengampu",
      label: "Guru Pengampu",
      note: "Periksa penetapan guru pengampu untuk setiap mata pelajaran.",
      total: assignmentCount,
      unit: "tugas",
    },
    {
      href: "/admin/tryout",
      label: "Tryout",
      note: "Pantau paket tryout yang sudah disusun dan dipublikasikan.",
      total: tryoutCount,
      unit: "tryout",
    },
  ];

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Administrasi"
        title="Pengelolaan Data Utama"
        description="Pilih menu yang ingin Anda kelola. Seluruh data utama sekolah ditempatkan di area ini agar pengaturan pengguna, mata pelajaran, dan penugasan guru pengampu dapat dilakukan secara tertib."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          accent="indigo"
          label="Guru"
          value={teacherCount}
          description="Akun guru yang siap mengelola bank soal dan hasil evaluasi."
        />
        <AdminStatCard
          accent="emerald"
          label="Siswa"
          value={studentCount}
          description="Data siswa aktif yang dapat mengakses tryout menggunakan NISN."
        />
        <AdminStatCard
          accent="amber"
          label="Mata Pelajaran"
          value={subjectCount}
          description="Daftar mata pelajaran yang dapat dipakai untuk tryout dan evaluasi."
        />
        <AdminStatCard
          accent="sky"
          label="Guru Pengampu"
          value={assignmentCount}
          description="Relasi guru dengan mata pelajaran yang sedang ditetapkan sistem."
        />
      </section>

      <SectionCard
        title="Ringkasan Data"
        description="Pantau data utama yang dikelola dalam sistem administrasi sekolah melalui ringkasan yang tersusun langsung dalam daftar data."
      >
        <div className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200/80 lg:block">
          <div className="grid grid-cols-[1.1fr_2fr_0.7fr_auto] gap-4 border-b border-slate-200/80 bg-slate-50/85 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>Data</span>
            <span>Keterangan</span>
            <span>Total</span>
            <span className="text-right">Halaman</span>
          </div>
          <div className="divide-y divide-slate-200/80 bg-white/88">
            {summaryRows.map((row) => (
              <div
                key={row.href}
                className="grid grid-cols-[1.1fr_2fr_0.7fr_auto] items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    {row.label}
                  </p>
                </div>
                <p className="text-sm leading-6 text-slate-600">{row.note}</p>
                <div className="text-sm font-semibold text-slate-950">
                  {row.total} {row.unit}
                </div>
                <div className="text-right">
                  <Link
                    href={row.href}
                    className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    Lihat Data
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:hidden">
          {summaryRows.map((row) => (
            <div
              key={row.href}
              className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-950">
                    {row.label}
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">{row.note}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {row.total} {row.unit}
                </span>
              </div>
              <div className="mt-4">
                <Link
                  href={row.href}
                  className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Lihat Data
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
