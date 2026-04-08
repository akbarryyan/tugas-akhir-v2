import {
  createTeacherAction,
  deleteTeacherAction,
  updateTeacherAction,
} from "@/app/admin/_actions";
import { TeacherFilters } from "@/app/admin/guru/_teacher-filters";
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
  TrashIcon,
} from "@/app/admin/_components";
import {
  ConfirmResetFormButton,
  ConfirmDeleteButton,
  LoadingSubmitButton,
} from "@/app/admin/_client-actions";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type GuruPageProps = {
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

export default async function GuruAdminPage({ searchParams }: GuruPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();
  const searchField = getTeacherSearchField(resolvedSearchParams?.field);
  const currentPage = parsePositiveInt(resolvedSearchParams?.page, 1);
  const sort = getTeacherSort(resolvedSearchParams?.sort);
  const order = getSortOrder(resolvedSearchParams?.order);

  const where = buildTeacherWhere(query, searchField);

  const totalTeachers = await prisma.teacherProfile.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalTeachers / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const teachers: Prisma.TeacherProfileGetPayload<{
    include: { user: true };
  }>[] = await prisma.teacherProfile.findMany({
    include: {
      user: true,
    },
    orderBy: getTeacherOrderBy(sort, order),
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
        eyebrow="Administrasi Guru"
        title="Data Guru"
        description="Kelola akun guru, identitas guru, serta informasi masuk yang digunakan untuk mengakses sistem."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <TeacherFilters
        field={searchField}
        query={query}
      />

      <div className="space-y-6">
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
          <div className="hidden lg:block">
            {teachers.length === 0 ? (
              <AdminEmptyState message="Belum ada data guru." />
            ) : (
              <DesktopTable minWidthClassName="min-w-[980px]">
                <DesktopTableHeaderRow columnsClassName="grid-cols-[1.1fr_1.2fr_0.9fr_1fr_9.5rem]">
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Nama Guru"
                    pathname="/admin/guru"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="name"
                  />
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Email"
                    pathname="/admin/guru"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="email"
                  />
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="NIP"
                    pathname="/admin/guru"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="nip"
                  />
                  <span>Password Baru</span>
                  <DesktopTableActionHeader>Aksi</DesktopTableActionHeader>
                </DesktopTableHeaderRow>

                <DesktopTableBody>
                  {teachers.map((teacher) => (
                    <DesktopTableRow
                      key={teacher.id}
                      columnsClassName="grid-cols-[1.1fr_1.2fr_0.9fr_1fr_9.5rem]"
                    >
                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Nama Guru
                            </span>
                            <input
                              form={`update-teacher-${teacher.id}`}
                              name="name"
                              type="text"
                              defaultValue={teacher.user.name}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Email
                            </span>
                            <input
                              form={`update-teacher-${teacher.id}`}
                              name="email"
                              type="email"
                              defaultValue={teacher.user.email ?? ""}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              NIP
                            </span>
                            <input
                              form={`update-teacher-${teacher.id}`}
                              name="nip"
                              type="text"
                              defaultValue={teacher.nip}
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                              required
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Password
                            </span>
                            <input
                              form={`update-teacher-${teacher.id}`}
                              name="password"
                              type="password"
                              placeholder="Opsional"
                              className="h-10 rounded-2xl border border-slate-200 px-3.5 outline-none transition focus:border-indigo-500"
                            />
                          </label>

                          <DesktopTableActionCell className="flex items-center justify-end gap-2">
                            <button
                              type="submit"
                              form={`update-teacher-${teacher.id}`}
                              className="rounded-2xl"
                              title="Perbarui data guru"
                            >
                              <TableIconButton title="Perbarui data guru" variant="primary">
                                <EditIcon />
                                <span className="sr-only">Perbarui</span>
                              </TableIconButton>
                            </button>
                            <form action={deleteTeacherAction}>
                              <input
                                type="hidden"
                                name="userId"
                                value={teacher.userId}
                              />
                              <ConfirmDeleteButton
                                className="rounded-2xl"
                                confirmTitle="Hapus Data Guru"
                                confirmMessage="Data guru ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
                              >
                                <TableIconButton title="Hapus data guru" variant="danger">
                                  <TrashIcon />
                                  <span className="sr-only">Hapus</span>
                                </TableIconButton>
                              </ConfirmDeleteButton>
                            </form>
                          </DesktopTableActionCell>
                          <form
                            id={`update-teacher-${teacher.id}`}
                            action={updateTeacherAction}
                            className="hidden"
                          >
                            <input type="hidden" name="teacherId" value={teacher.id} />
                            <input type="hidden" name="userId" value={teacher.userId} />
                          </form>
                    </DesktopTableRow>
                  ))}
                </DesktopTableBody>
              </DesktopTable>
            )}
          </div>

          <div className="grid gap-4 lg:hidden">
            {teachers.length === 0 ? (
              <AdminEmptyState message="Belum ada data guru." />
            ) : (
              teachers.map((teacher) => (
                <MobileDataCard key={teacher.id}>
                  <MobileDataCardHeader
                    badge={
                      <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        NIP {teacher.nip}
                      </span>
                    }
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {(teacher.user.name ?? "G").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="truncate text-lg font-semibold text-slate-950">
                          {teacher.user.name}
                        </h3>
                        <p className="truncate text-sm text-slate-600">
                          {teacher.user.email ?? "Email belum tersedia"}
                        </p>
                      </div>
                    </div>
                  </MobileDataCardHeader>

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
                </MobileDataCard>
              ))
            )}
          </div>

          <PaginationControls
            currentPage={safePage}
            pathname="/admin/guru"
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

function getTeacherSearchField(field?: string) {
  if (field === "email" || field === "name" || field === "nip") {
    return field;
  }

  return "all";
}

function getTeacherSort(sort?: string) {
  if (sort === "email" || sort === "nip") {
    return sort;
  }

  return "name";
}

function getTeacherOrderBy(sort: string, order: "asc" | "desc") {
  if (sort === "email") {
    return {
      user: {
        email: order,
      },
    } as const;
  }

  if (sort === "nip") {
    return {
      nip: order,
    } as const;
  }

  return {
    user: {
      name: order,
    },
  } as const;
}

function buildTeacherWhere(
  query: string | undefined,
  field: "all" | "email" | "name" | "nip",
): Prisma.TeacherProfileWhereInput | undefined {
  if (!query) {
    return undefined;
  }

  if (field === "nip") {
    return {
      nip: {
        contains: query,
      },
    };
  }

  if (field === "email") {
    return {
      user: {
        is: {
          email: {
            contains: query,
          },
        },
      },
    };
  }

  if (field === "name") {
    return {
      user: {
        is: {
          name: {
            contains: query,
          },
        },
      },
    };
  }

  return {
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
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}
