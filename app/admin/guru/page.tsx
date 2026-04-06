import {
  createTeacherAction,
  deleteTeacherAction,
  updateTeacherAction,
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

type GuruPageProps = {
  searchParams?: Promise<{
    message?: string;
    q?: string;
    type?: string;
  }>;
};

export default async function GuruAdminPage({ searchParams }: GuruPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();

  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: true,
    },
    where: query
      ? {
          OR: [
            {
              nip: {
                contains: query,
              },
            },
            {
              user: {
                is: {
                  email: {
                    contains: query,
                  },
                },
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
        eyebrow="Administrasi Guru"
        title="Data Guru"
        description="Kelola akun guru, identitas guru, serta informasi masuk yang digunakan untuk mengakses sistem."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <SearchToolbar
        query={query}
        placeholder="Cari nama guru, email, atau NIP"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Tambah Guru"
          description="Isi data guru baru. Password awal dapat diubah kembali melalui proses pembaruan data."
        >
          <form action={createTeacherAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nama Guru
              <input
                name="name"
                type="text"
                placeholder="Masukkan nama lengkap guru"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                name="email"
                type="email"
                placeholder="guru@sekolah.sch.id"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              NIP
              <input
                name="nip"
                type="text"
                placeholder="Masukkan NIP guru"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Password Awal
              <input
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <div className="mt-2 flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Data Guru"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan data guru..."
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Daftar Guru"
          description="Perbarui data guru secara langsung dari daftar berikut."
        >
          <div className="grid gap-4">
            {teachers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                Belum ada data guru.
              </p>
            ) : (
              teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="rounded-[1.5rem] border border-slate-200 p-4"
                >
                  <form action={updateTeacherAction} className="grid gap-4">
                    <input type="hidden" name="teacherId" value={teacher.id} />
                    <input type="hidden" name="userId" value={teacher.userId} />

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Nama Guru
                        <input
                          name="name"
                          type="text"
                          defaultValue={teacher.user.name}
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                          required
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Email
                        <input
                          name="email"
                          type="email"
                          defaultValue={teacher.user.email ?? ""}
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                          required
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        NIP
                        <input
                          name="nip"
                          type="text"
                          defaultValue={teacher.nip}
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                          required
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        Password Baru
                        <input
                          name="password"
                          type="password"
                          placeholder="Kosongkan jika tidak diubah"
                          className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <LoadingSubmitButton
                        idleLabel="Perbarui"
                        pendingLabel="Memperbarui..."
                        loadingMessage="Memperbarui data guru..."
                        className="h-10 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </form>

                  <form action={deleteTeacherAction} className="mt-3">
                    <input type="hidden" name="userId" value={teacher.userId} />
                    <ConfirmDeleteButton
                      confirmTitle="Hapus Data Guru"
                      confirmMessage="Data guru ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
                    >
                      Hapus Guru
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
