import {
  createStudentAction,
  deleteStudentAction,
  updateStudentAction,
} from "@/app/admin/_actions";
import {
  SearchToolbar,
  PageIntro,
  SectionCard,
  StatusAlert,
} from "@/app/admin/_components";
import {
  ConfirmResetFormButton,
  ConfirmDeleteButton,
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import { prisma } from "@/lib/db/prisma";

type SiswaPageProps = {
  searchParams?: Promise<{
    message?: string;
    q?: string;
    type?: string;
  }>;
};

export default async function SiswaAdminPage({ searchParams }: SiswaPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();

  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
    },
    where: query
      ? {
          OR: [
            {
              className: {
                contains: query,
              },
            },
            {
              nisn: {
                contains: query,
              },
            },
            {
              user: {
                is: {
                  name: {
                    contains: query,
                  },
                },
              },
            },
          ],
        }
      : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Administrasi Siswa"
        title="Data Siswa"
        description="Kelola data siswa beserta NISN yang digunakan untuk mengakses sistem tanpa password."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <SearchToolbar
        query={query}
        placeholder="Cari nama siswa, NISN, atau kelas"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Tambah Siswa"
          description="Tambahkan data siswa baru. Akun siswa akan menggunakan NISN sebagai identitas masuk."
        >
          <form action={createStudentAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nama Siswa
              <input
                name="name"
                type="text"
                placeholder="Masukkan nama lengkap siswa"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              NISN
              <input
                name="nisn"
                type="text"
                inputMode="numeric"
                placeholder="Masukkan NISN siswa"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Kelas
              <input
                name="className"
                type="text"
                placeholder="Contoh: XII IPA 1"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <div className="mt-2 flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Data Siswa"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan data siswa..."
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Daftar Siswa"
          description="Perbarui data siswa secara langsung dari daftar berikut."
        >
          <div className="grid gap-4">
            {students.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                Belum ada data siswa.
              </p>
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  className="rounded-[1.5rem] border border-slate-200 p-4"
                >
                  <form action={updateStudentAction} className="grid gap-4">
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="userId" value={student.userId} />

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Nama Siswa
                        <input
                          name="name"
                          type="text"
                          defaultValue={student.user.name}
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                          required
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        NISN
                        <input
                          name="nisn"
                          type="text"
                          defaultValue={student.nisn}
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                          required
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Kelas
                        <input
                          name="className"
                          type="text"
                          defaultValue={student.className}
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                          required
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <LoadingSubmitButton
                        idleLabel="Perbarui"
                        pendingLabel="Memperbarui..."
                        loadingMessage="Memperbarui data siswa..."
                        className="h-10 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </form>

                  <form action={deleteStudentAction} className="mt-3">
                    <input type="hidden" name="userId" value={student.userId} />
                    <ConfirmDeleteButton
                      confirmTitle="Hapus Data Siswa"
                      confirmMessage="Data siswa ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
                    >
                      Hapus Siswa
                    </ConfirmDeleteButton>
                  </form>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
