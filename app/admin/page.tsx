import { AdminLinkCard, PageIntro } from "@/app/admin/_components";
import { prisma } from "@/lib/db/prisma";

export default async function AdminPage() {
  const [teacherCount, studentCount, subjectCount, assignmentCount] =
    await Promise.all([
      prisma.teacherProfile.count(),
      prisma.studentProfile.count(),
      prisma.subject.count(),
      prisma.subjectTeacher.count(),
    ]);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Administrasi"
        title="Pengelolaan Data Utama"
        description="Pilih menu yang ingin Anda kelola. Seluruh data utama sekolah ditempatkan di area ini agar pengaturan pengguna, mata pelajaran, dan penugasan guru pengampu dapat dilakukan secara tertib."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Guru
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {teacherCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Guru yang terdaftar</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Siswa
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {studentCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Siswa yang terdaftar</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Mata Pelajaran
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {subjectCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Mapel yang tersedia</p>
        </div>

        <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Guru Pengampu
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {assignmentCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">Penugasan yang aktif</p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <AdminLinkCard
          href="/admin/guru"
          title="Data Guru"
          description="Tambah, perbarui, dan hapus data guru beserta akun masuknya."
        />
        <AdminLinkCard
          href="/admin/siswa"
          title="Data Siswa"
          description="Kelola data siswa dan NISN yang digunakan untuk masuk ke sistem."
        />
        <AdminLinkCard
          href="/admin/mapel"
          title="Mata Pelajaran"
          description="Atur daftar mata pelajaran yang digunakan pada kegiatan tryout."
        />
        <AdminLinkCard
          href="/admin/pengampu"
          title="Guru Pengampu"
          description="Tetapkan guru pengampu untuk setiap mata pelajaran yang tersedia."
        />
      </section>
    </div>
  );
}
