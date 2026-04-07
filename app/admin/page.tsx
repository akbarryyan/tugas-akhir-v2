import {
  AdminLinkCard,
  AdminStatCard,
  PageIntro,
  SectionCard,
} from "@/app/admin/_components";
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
        title="Akses Cepat Administrasi"
        description="Gunakan pintasan berikut untuk masuk ke area kerja yang paling sering dipakai dalam pengelolaan data utama."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <AdminLinkCard
            href="/admin/guru"
            title="Data Guru"
            metric={`${teacherCount} data`}
            description="Tambah, perbarui, dan hapus data guru beserta akun masuknya."
          />
          <AdminLinkCard
            href="/admin/siswa"
            title="Data Siswa"
            metric={`${studentCount} data`}
            description="Kelola data siswa dan NISN yang digunakan untuk masuk ke sistem."
          />
          <AdminLinkCard
            href="/admin/mapel"
            title="Mata Pelajaran"
            metric={`${subjectCount} mapel`}
            description="Atur daftar mata pelajaran yang digunakan pada kegiatan tryout."
          />
          <AdminLinkCard
            href="/admin/pengampu"
            title="Guru Pengampu"
            metric={`${assignmentCount} tugas`}
            description="Tetapkan guru pengampu untuk setiap mata pelajaran yang tersedia."
          />
        </div>
      </SectionCard>
    </div>
  );
}
