import {
  createSubjectAction,
  deleteSubjectAction,
  toggleSubjectStatusAction,
  updateSubjectAction,
} from "@/app/admin/_actions";
import {
  SearchToolbar,
  PageIntro,
  SectionCard,
  StatusAlert,
} from "@/app/admin/_components";
import {
  ConfirmActionButton,
  ConfirmResetFormButton,
  ConfirmDeleteButton,
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import { prisma } from "@/lib/db/prisma";

type MapelPageProps = {
  searchParams?: Promise<{
    message?: string;
    q?: string;
    type?: string;
  }>;
};

export default async function MapelAdminPage({ searchParams }: MapelPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();

  const subjects = await prisma.subject.findMany({
    include: {
      _count: {
        select: {
          questions: true,
          subjectTeachers: true,
        },
      },
    },
    where: query
      ? {
          OR: [
            {
              description: {
                contains: query,
              },
            },
            {
              name: {
                contains: query,
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
        eyebrow="Administrasi Mata Pelajaran"
        title="Mata Pelajaran"
        description="Kelola daftar mata pelajaran yang akan digunakan pada kegiatan tryout dan pengelolaan soal."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <SearchToolbar
        confirmReset
        query={query}
        placeholder="Cari nama atau deskripsi mata pelajaran"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Tambah Mata Pelajaran"
          description="Tambahkan mata pelajaran baru dan tentukan status aktifnya."
        >
          <form action={createSubjectAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nama Mata Pelajaran
              <input
                name="name"
                type="text"
                placeholder="Contoh: Bahasa Indonesia"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Deskripsi
              <textarea
                name="description"
                rows={4}
                placeholder="Keterangan singkat mata pelajaran"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked
                className="size-4 rounded border-slate-300"
              />
              Mata pelajaran aktif
            </label>

            <div className="mt-2 flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Mata Pelajaran"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan mata pelajaran..."
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Daftar Mata Pelajaran"
          description="Perbarui nama, deskripsi, dan status aktif mata pelajaran."
        >
          <div className="grid gap-4">
            {subjects.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                Belum ada mata pelajaran.
              </p>
            ) : (
              subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-[1.5rem] border border-slate-200 p-4"
                >
                  <div className="mb-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {subject.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {subject._count.subjectTeachers} guru pengampu
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {subject._count.questions} soal
                    </span>
                  </div>

                  <form action={updateSubjectAction} className="grid gap-4">
                    <input type="hidden" name="subjectId" value={subject.id} />

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Nama Mata Pelajaran
                      <input
                        name="name"
                        type="text"
                        defaultValue={subject.name}
                        className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                        required
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Deskripsi
                      <textarea
                        name="description"
                        rows={3}
                        defaultValue={subject.description ?? ""}
                        className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500"
                      />
                    </label>

                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        name="isActive"
                        type="checkbox"
                        defaultChecked={subject.isActive}
                        className="size-4 rounded border-slate-300"
                      />
                      Mata pelajaran aktif
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <LoadingSubmitButton
                        idleLabel="Perbarui"
                        pendingLabel="Memperbarui..."
                        loadingMessage="Memperbarui mata pelajaran..."
                        className="h-10 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  </form>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <form action={toggleSubjectStatusAction}>
                      <input type="hidden" name="subjectId" value={subject.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={subject.isActive ? "false" : "true"}
                      />
                      <ConfirmActionButton
                        confirmLabel={subject.isActive ? "Ya, nonaktifkan" : "Ya, aktifkan"}
                        confirmTitle={
                          subject.isActive
                            ? "Nonaktifkan Mata Pelajaran"
                            : "Aktifkan Mata Pelajaran"
                        }
                        confirmMessage={
                          subject.isActive
                            ? "Mata pelajaran ini akan dinonaktifkan dari daftar aktif. Guru masih dapat melihat riwayat data yang sudah ada."
                            : "Mata pelajaran ini akan diaktifkan kembali dan bisa digunakan pada pengelolaan data berikutnya."
                        }
                        className={`h-10 rounded-full px-4 text-sm font-semibold transition ${
                          subject.isActive
                            ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {subject.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </ConfirmActionButton>
                    </form>

                    <form action={deleteSubjectAction}>
                      <input type="hidden" name="subjectId" value={subject.id} />
                      <ConfirmDeleteButton
                        confirmTitle="Hapus Mata Pelajaran"
                        confirmMessage="Mata pelajaran ini akan dihapus. Jika masih terhubung dengan data lain, penghapusan dapat ditolak oleh sistem."
                      >
                        Hapus Mata Pelajaran
                      </ConfirmDeleteButton>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
