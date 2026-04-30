import {
  createSubjectAction,
  deleteSubjectAction,
  importSubjectsFromExcelAction,
  toggleSubjectStatusAction,
  updateSubjectAction,
} from "@/app/admin/_actions";
import { LiveFilters } from "@/app/admin/_live-filters";
import {
  AdminEmptyState,
  DesktopTable,
  DesktopTableActionCell,
  DesktopTableActionHeader,
  DesktopTableBody,
  DesktopTableHeaderRow,
  DesktopTableRow,
  EditIcon,
  MobileDataCard,
  MobileDataCardHeader,
  PageIntro,
  PaginationControls,
  SectionCard,
  SortableHeaderLink,
  StatusAlert,
  TableIconButton,
  ToggleIcon,
  TrashIcon,
} from "@/app/admin/_components";
import {
  ConfirmActionButton,
  ConfirmResetFormButton,
  ConfirmDeleteButton,
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type MapelPageProps = {
  searchParams?: Promise<{
    message?: string;
    order?: string;
    page?: string;
    field?: string;
    q?: string;
    sort?: string;
    type?: string;
  }>;
};

const PAGE_SIZE = 8;

export default async function MapelAdminPage({ searchParams }: MapelPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();
  const searchField = getSubjectSearchField(resolvedSearchParams?.field);
  const currentPage = parsePositiveInt(resolvedSearchParams?.page, 1);
  const sort = getSubjectSort(resolvedSearchParams?.sort);
  const order = getSortOrder(resolvedSearchParams?.order);

  const where = buildSubjectWhere(query, searchField);

  const totalSubjects = await prisma.subject.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalSubjects / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const subjects: Prisma.SubjectGetPayload<{
    include: {
      _count: {
        select: {
          questions: true;
          subjectTeachers: true;
        };
      };
    };
  }>[] = await prisma.subject.findMany({
    include: {
      _count: {
        select: {
          questions: true,
          subjectTeachers: true,
        },
      },
    },
    orderBy: getSubjectOrderBy(sort, order),
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });

  const tableParams = {
    field: searchField === "all" ? undefined : searchField,
    order,
    q: query,
    sort,
  };

  return (
    <div className="space-y-8 overflow-x-clip">
      <PageIntro
        eyebrow="Administrasi Mata Pelajaran"
        title="Mata Pelajaran"
        description="Kelola daftar mata pelajaran yang akan digunakan pada kegiatan tryout dan pengelolaan soal."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <LiveFilters
        field={searchField}
        options={[
          { label: "Semua Data", value: "all" },
          { label: "Nama Mata Pelajaran", value: "name" },
          { label: "Deskripsi", value: "description" },
          { label: "Status", value: "isActive" },
        ]}
        query={query}
        placeholder="Cari nama atau deskripsi mata pelajaran"
      />

      <div className="space-y-6">
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
                className="h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Import Excel Mata Pelajaran"
          description="Unggah file Excel untuk menambahkan banyak mata pelajaran sekaligus dari sheet pertama."
        >
          <form action={importSubjectsFromExcelAction} className="grid gap-4">
            <div className="rounded-[1rem] border border-sky-100 bg-sky-50/60 p-4 text-sm leading-6 text-slate-600">
              <p className="font-semibold text-sky-700">
                Format kolom yang didukung
              </p>
              <p className="mt-1">
                Header wajib: <span className="font-semibold">nama</span>.
                Header opsional: <span className="font-semibold">deskripsi</span>{" "}
                dan <span className="font-semibold">status</span>. Status bisa
                diisi <span className="font-semibold">aktif</span>,{" "}
                <span className="font-semibold">nonaktif</span>,{" "}
                <span className="font-semibold">true</span>, atau{" "}
                <span className="font-semibold">false</span>.
              </p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              File Excel
              <input
                name="file"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
                required
              />
              <span className="text-xs font-normal leading-5 text-slate-500">
                Maksimal 200 baris dan ukuran file 2 MB. Sistem akan menolak
                nama mata pelajaran yang sudah terdaftar.
              </span>
            </label>

            <div className="mt-2 flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Import Mata Pelajaran"
                pendingLabel="Mengimpor..."
                loadingMessage="Mengimpor mata pelajaran dari Excel..."
                className="h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Daftar Mata Pelajaran"
          description="Perbarui nama, deskripsi, dan status aktif mata pelajaran."
        >
          <div className="hidden lg:block">
            {subjects.length === 0 ? (
              <AdminEmptyState message="Belum ada mata pelajaran." />
            ) : (
              <DesktopTable minWidthClassName="min-w-[980px]">
                <DesktopTableHeaderRow columnsClassName="grid-cols-[0.9fr_1.2fr_0.8fr_9.5rem]">
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Mata Pelajaran"
                    pathname="/admin/mapel"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="name"
                  />
                  <span>Deskripsi</span>
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Status"
                    pathname="/admin/mapel"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="isActive"
                  />
                  <DesktopTableActionHeader>Aksi</DesktopTableActionHeader>
                </DesktopTableHeaderRow>

                <DesktopTableBody>
                  {subjects.map((subject) => (
                    <DesktopTableRow
                      key={subject.id}
                      columnsClassName="grid-cols-[0.9fr_1.2fr_0.8fr_9.5rem]"
                    >
                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Nama
                            </span>
                            <input
                              form={`update-subject-${subject.id}`}
                              name="name"
                              type="text"
                              defaultValue={subject.name}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Deskripsi
                            </span>
                            <textarea
                              form={`update-subject-${subject.id}`}
                              name="description"
                              rows={2}
                              defaultValue={subject.description ?? ""}
                              className="rounded-2xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-indigo-500"
                            />
                          </label>

                          <div className="grid gap-2 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Aktif
                            </span>
                            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-2.5">
                              <input
                                form={`update-subject-${subject.id}`}
                                name="isActive"
                                type="checkbox"
                                defaultChecked={subject.isActive}
                                className="size-4 rounded border-slate-300"
                              />
                              <span className="text-sm text-slate-600">
                                {subject.isActive ? "Sedang aktif" : "Sedang nonaktif"}
                              </span>
                            </label>
                          </div>

                          <DesktopTableActionCell className="flex items-center justify-end gap-2">
                            <button
                              type="submit"
                              form={`update-subject-${subject.id}`}
                              className="rounded-2xl"
                              title="Perbarui mata pelajaran"
                            >
                              <TableIconButton title="Perbarui mata pelajaran" variant="primary">
                                <EditIcon />
                                <span className="sr-only">Perbarui</span>
                              </TableIconButton>
                            </button>
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
                                    ? "Mata pelajaran ini akan dinonaktifkan dari daftar aktif."
                                    : "Mata pelajaran ini akan diaktifkan kembali."
                                }
                                className="rounded-2xl"
                              >
                                <TableIconButton
                                  title={subject.isActive ? "Nonaktifkan mata pelajaran" : "Aktifkan mata pelajaran"}
                                  variant="neutral"
                                >
                                  <ToggleIcon />
                                  <span className="sr-only">
                                    {subject.isActive ? "Nonaktifkan" : "Aktifkan"}
                                  </span>
                                </TableIconButton>
                              </ConfirmActionButton>
                            </form>
                            <form action={deleteSubjectAction}>
                              <input type="hidden" name="subjectId" value={subject.id} />
                              <ConfirmDeleteButton
                                className="rounded-2xl"
                                confirmTitle="Hapus Mata Pelajaran"
                                confirmMessage="Mata pelajaran ini akan dihapus. Jika masih terhubung dengan data lain, penghapusan dapat ditolak oleh sistem."
                              >
                                <TableIconButton title="Hapus mata pelajaran" variant="danger">
                                  <TrashIcon />
                                  <span className="sr-only">Hapus</span>
                                </TableIconButton>
                              </ConfirmDeleteButton>
                            </form>
                          </DesktopTableActionCell>

                          <form
                            id={`update-subject-${subject.id}`}
                            action={updateSubjectAction}
                            className="hidden"
                          >
                            <input type="hidden" name="subjectId" value={subject.id} />
                          </form>
                    </DesktopTableRow>
                  ))}
                </DesktopTableBody>
              </DesktopTable>
            )}
          </div>

          <div className="grid gap-4 lg:hidden">
            {subjects.length === 0 ? (
              <AdminEmptyState message="Belum ada mata pelajaran." />
            ) : (
              subjects.map((subject) => (
                <MobileDataCard key={subject.id}>
                  <MobileDataCardHeader
                    badge={
                      <span
                        className={`max-w-full truncate rounded-full px-3 py-1 text-xs font-semibold ${
                          subject.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {subject.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    }
                  >
                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate text-lg font-semibold text-slate-950">
                        {subject.name}
                      </h3>
                      <p className="line-clamp-3 text-sm text-slate-600">
                        {subject.description?.trim()
                          ? subject.description
                          : "Belum ada deskripsi singkat untuk mata pelajaran ini."}
                      </p>
                    </div>
                  </MobileDataCardHeader>

                  <div className="mb-4 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1">
                      {subject._count.subjectTeachers} guru pengampu
                    </span>
                    <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1">
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
                </MobileDataCard>
              ))
            )}
          </div>

          <PaginationControls
            currentPage={safePage}
            pathname="/admin/mapel"
            searchParams={tableParams}
            totalPages={totalPages}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function getSortOrder(order?: string) {
  return order === "desc" ? "desc" : "asc";
}

function getSubjectSearchField(field?: string) {
  if (
    field === "description" ||
    field === "isActive" ||
    field === "name"
  ) {
    return field;
  }

  return "all";
}

function getSubjectSort(sort?: string) {
  if (sort === "isActive") {
    return sort;
  }

  return "name";
}

function getSubjectOrderBy(sort: string, order: "asc" | "desc") {
  if (sort === "isActive") {
    return {
      isActive: order,
    } as const;
  }

  return {
    name: order,
  } as const;
}

function buildSubjectWhere(
  query: string | undefined,
  field: "all" | "description" | "isActive" | "name",
): Prisma.SubjectWhereInput | undefined {
  if (!query) {
    return undefined;
  }

  if (field === "name") {
    return {
      name: {
        contains: query,
      },
    };
  }

  if (field === "description") {
    return {
      description: {
        contains: query,
      },
    };
  }

  if (field === "isActive") {
    const normalizedQuery = query.toLowerCase();
    const shouldBeActive =
      normalizedQuery.includes("aktif") ||
      normalizedQuery.includes("active") ||
      normalizedQuery === "1" ||
      normalizedQuery === "true";

    return {
      isActive: shouldBeActive,
    };
  }

  return {
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
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
