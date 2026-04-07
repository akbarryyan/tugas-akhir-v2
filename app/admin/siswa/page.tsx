import {
  createStudentAction,
  deleteStudentAction,
  updateStudentAction,
} from "@/app/admin/_actions";
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
  SearchToolbar,
  SectionCard,
  SortableHeaderLink,
  StatusAlert,
  TableIconButton,
  TrashIcon,
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
    order?: string;
    page?: string;
    q?: string;
    sort?: string;
    type?: string;
  }>;
};

const PAGE_SIZE = 8;

export default async function SiswaAdminPage({ searchParams }: SiswaPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();
  const currentPage = parsePositiveInt(resolvedSearchParams?.page, 1);
  const sort = getStudentSort(resolvedSearchParams?.sort);
  const order = getSortOrder(resolvedSearchParams?.order);

  const where = query
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
    : undefined;

  const totalStudents = await prisma.studentProfile.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalStudents / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
    },
    orderBy: getStudentOrderBy(sort, order),
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    where,
  });

  const tableParams = {
    order,
    q: query,
    sort,
  };
  const resetHref = buildPageHref("/admin/siswa", {
    order,
    sort,
  });

  return (
    <div className="space-y-8 overflow-x-clip">
      <PageIntro
        eyebrow="Administrasi Siswa"
        title="Data Siswa"
        description="Kelola data siswa beserta NISN yang digunakan untuk mengakses sistem tanpa password."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <SearchToolbar
        params={tableParams}
        query={query}
        placeholder="Cari nama siswa, NISN, atau kelas"
        resetHref={resetHref}
      />

      <div className="space-y-6">
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
          <div className="hidden lg:block">
            {students.length === 0 ? (
              <AdminEmptyState message="Belum ada data siswa." />
            ) : (
              <DesktopTable minWidthClassName="min-w-[860px]">
                <DesktopTableHeaderRow columnsClassName="grid-cols-[1fr_0.9fr_0.9fr_auto]">
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Nama Siswa"
                    pathname="/admin/siswa"
                    searchParams={{ q: query }}
                    sortKey="name"
                  />
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="NISN"
                    pathname="/admin/siswa"
                    searchParams={{ q: query }}
                    sortKey="nisn"
                  />
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Kelas"
                    pathname="/admin/siswa"
                    searchParams={{ q: query }}
                    sortKey="className"
                  />
                  <DesktopTableActionHeader>Aksi</DesktopTableActionHeader>
                </DesktopTableHeaderRow>

                <DesktopTableBody>
                  {students.map((student) => (
                    <DesktopTableRow
                      key={student.id}
                      columnsClassName="grid-cols-[1fr_0.9fr_0.9fr_auto]"
                    >
                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Nama
                            </span>
                            <input
                              form={`update-student-${student.id}`}
                              name="name"
                              type="text"
                              defaultValue={student.user.name}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              NISN
                            </span>
                            <input
                              form={`update-student-${student.id}`}
                              name="nisn"
                              type="text"
                              defaultValue={student.nisn}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Kelas
                            </span>
                            <input
                              form={`update-student-${student.id}`}
                              name="className"
                              type="text"
                              defaultValue={student.className}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <DesktopTableActionCell className="flex items-center justify-end gap-2">
                            <button
                              type="submit"
                              form={`update-student-${student.id}`}
                              className="rounded-2xl"
                              title="Perbarui data siswa"
                            >
                              <TableIconButton title="Perbarui data siswa" variant="primary">
                                <EditIcon />
                                <span className="sr-only">Perbarui</span>
                              </TableIconButton>
                            </button>
                            <form action={deleteStudentAction}>
                              <input
                                type="hidden"
                                name="userId"
                                value={student.userId}
                              />
                              <ConfirmDeleteButton
                                className="rounded-2xl"
                                confirmTitle="Hapus Data Siswa"
                                confirmMessage="Data siswa ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
                              >
                                <TableIconButton title="Hapus data siswa" variant="danger">
                                  <TrashIcon />
                                  <span className="sr-only">Hapus</span>
                                </TableIconButton>
                              </ConfirmDeleteButton>
                            </form>
                          </DesktopTableActionCell>

                          <form
                            id={`update-student-${student.id}`}
                            action={updateStudentAction}
                            className="hidden"
                          >
                            <input type="hidden" name="studentId" value={student.id} />
                            <input type="hidden" name="userId" value={student.userId} />
                          </form>
                    </DesktopTableRow>
                  ))}
                </DesktopTableBody>
              </DesktopTable>
            )}
          </div>

          <div className="grid gap-4 lg:hidden">
            {students.length === 0 ? (
              <AdminEmptyState message="Belum ada data siswa." />
            ) : (
              students.map((student) => (
                <MobileDataCard key={student.id}>
                  <MobileDataCardHeader
                    badge={
                      <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {student.className}
                      </span>
                    }
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-700">
                        {(student.user.name ?? "S").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="truncate text-lg font-semibold text-slate-950">
                          {student.user.name}
                        </h3>
                        <p className="truncate text-sm text-slate-600">
                          NISN {student.nisn}
                        </p>
                      </div>
                    </div>
                  </MobileDataCardHeader>

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
                </MobileDataCard>
              ))
            )}
          </div>

          <PaginationControls
            currentPage={safePage}
            pathname="/admin/siswa"
            searchParams={tableParams}
            totalPages={totalPages}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function buildPageHref(
  pathname: string,
  params: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getSortOrder(order?: string) {
  return order === "desc" ? "desc" : "asc";
}

function getStudentSort(sort?: string) {
  if (sort === "className" || sort === "nisn") {
    return sort;
  }

  return "name";
}

function getStudentOrderBy(sort: string, order: "asc" | "desc") {
  if (sort === "nisn") {
    return {
      nisn: order,
    } as const;
  }

  if (sort === "className") {
    return {
      className: order,
    } as const;
  }

  return {
    user: {
      name: order,
    },
  } as const;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
