import {
  assignTeacherAction,
  deleteAssignmentAction,
} from "@/lib/admin/assignment-actions";
import { LiveFilters } from "@/app/admin/_live-filters";
import {
  AdminEmptyState,
  DesktopTable,
  DesktopTableActionCell,
  DesktopTableActionHeader,
  DesktopTableBody,
  DesktopTableHeaderRow,
  DesktopTableRow,
  MobileDataCard,
  MobileDataCardHeader,
  PaginationControls,
  PageIntro,
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

type PengampuPageProps = {
  searchParams?: Promise<{
    field?: string;
    message?: string;
    order?: string;
    page?: string;
    q?: string;
    sort?: string;
    type?: string;
  }>;
};

const PAGE_SIZE = 8;

export default async function PengampuAdminPage({
  searchParams,
}: PengampuPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim();
  const searchField = getAssignmentSearchField(resolvedSearchParams?.field);
  const currentPage = parsePositiveInt(resolvedSearchParams?.page, 1);
  const sort = getAssignmentSort(resolvedSearchParams?.sort);
  const order = getSortOrder(resolvedSearchParams?.order);
  const where = buildAssignmentWhere(query, searchField);

  const [teachers, subjects, totalAssignments] = await Promise.all([
    prisma.teacherProfile.findMany({
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    }),
    prisma.subject.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.subjectTeacher.count({
      where,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalAssignments / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const assignments: Prisma.SubjectTeacherGetPayload<{
    include: {
      subject: true;
      teacher: {
        include: {
          user: true;
        };
      };
    };
  }>[] = await prisma.subjectTeacher.findMany({
    include: {
      subject: true,
      teacher: {
        include: {
          user: true,
        },
      },
    },
    orderBy: getAssignmentOrderBy(sort, order),
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
        eyebrow="Administrasi Pengampu"
        title="Guru Pengampu Mata Pelajaran"
        description="Tetapkan guru pengampu untuk setiap mata pelajaran agar pengelolaan soal dan hasil tryout dapat dibatasi sesuai kewenangan."
      />

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <LiveFilters
        field={searchField}
        options={[
          { label: "Semua Data", value: "all" },
          { label: "Mata Pelajaran", value: "subject" },
          { label: "Guru", value: "teacher" },
          { label: "NIP", value: "nip" },
        ]}
        query={query}
        placeholder="Cari mata pelajaran, nama guru, atau NIP"
      />

      <div className="space-y-6">
        <SectionCard
          title="Tetapkan Guru Pengampu"
          description="Pilih mata pelajaran dan guru yang akan ditugaskan."
        >
          <form action={assignTeacherAction} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Mata Pelajaran
              <select
                name="subjectId"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Pilih mata pelajaran
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Guru
              <select
                name="teacherId"
                className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-indigo-500"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Pilih guru
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user.name} - {teacher.nip}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Penugasan"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan penugasan guru pengampu..."
                className="h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <ConfirmResetFormButton
                confirmMessage="Pilihan guru dan mata pelajaran yang belum disimpan akan dikosongkan."
              />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Daftar Penugasan"
          description="Tinjau guru pengampu yang sudah ditetapkan untuk setiap mata pelajaran."
        >
          <div className="hidden lg:block">
            {assignments.length === 0 ? (
              <AdminEmptyState message="Belum ada penugasan guru pengampu." />
            ) : (
              <DesktopTable minWidthClassName="min-w-[860px]">
                <DesktopTableHeaderRow columnsClassName="grid-cols-[1fr_1fr_0.9fr_auto]">
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Mata Pelajaran"
                    pathname="/admin/pengampu"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="subject"
                  />
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="Guru"
                    pathname="/admin/pengampu"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="teacher"
                  />
                  <SortableHeaderLink
                    currentOrder={order}
                    currentSort={sort}
                    label="NIP"
                    pathname="/admin/pengampu"
                    searchParams={{
                      field: searchField === "all" ? undefined : searchField,
                      q: query,
                    }}
                    sortKey="nip"
                  />
                  <DesktopTableActionHeader>Aksi</DesktopTableActionHeader>
                </DesktopTableHeaderRow>

                <DesktopTableBody>
                  {assignments.map((assignment) => (
                    <DesktopTableRow
                      key={assignment.id}
                      columnsClassName="grid-cols-[1fr_1fr_0.9fr_auto] items-center"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-950">
                          {assignment.subject.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Mata pelajaran aktif
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-950">
                          {assignment.teacher.user.name}
                        </p>
                        <p className="text-xs text-slate-500">Guru pengampu</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        {assignment.teacher.nip}
                      </div>
                      <DesktopTableActionCell className="flex items-center justify-end">
                        <form action={deleteAssignmentAction}>
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <ConfirmDeleteButton
                            className="rounded-2xl"
                            confirmTitle="Hapus Penugasan Pengampu"
                            confirmMessage="Penugasan guru pengampu ini akan dihapus dari daftar."
                          >
                            <TableIconButton
                              title="Hapus penugasan pengampu"
                              variant="danger"
                            >
                              <TrashIcon />
                              <span className="sr-only">Hapus</span>
                            </TableIconButton>
                          </ConfirmDeleteButton>
                        </form>
                      </DesktopTableActionCell>
                    </DesktopTableRow>
                  ))}
                </DesktopTableBody>
              </DesktopTable>
            )}
          </div>

          <div className="grid gap-4 lg:hidden">
            {assignments.length === 0 ? (
              <AdminEmptyState message="Belum ada penugasan guru pengampu." />
            ) : (
              assignments.map((assignment) => (
                <MobileDataCard key={assignment.id}>
                  <MobileDataCardHeader>
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-semibold text-sky-700">
                        PG
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-lg font-semibold text-slate-950">
                          {assignment.subject.name}
                        </h2>
                        <p className="truncate text-sm text-slate-600">
                          {assignment.teacher.user.name}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          NIP: {assignment.teacher.nip}
                        </p>
                      </div>
                    </div>
                  </MobileDataCardHeader>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {assignment.subject.name}
                    </span>
                    <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {assignment.teacher.user.name}
                    </span>

                    <form action={deleteAssignmentAction}>
                      <input
                        type="hidden"
                        name="assignmentId"
                        value={assignment.id}
                      />
                      <ConfirmDeleteButton
                        confirmTitle="Hapus Penugasan Pengampu"
                        confirmMessage="Penugasan guru pengampu ini akan dihapus dari daftar."
                      >
                        Hapus Penugasan
                      </ConfirmDeleteButton>
                    </form>
                  </div>
                </MobileDataCard>
              ))
            )}
          </div>

          <PaginationControls
            currentPage={safePage}
            pathname="/admin/pengampu"
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

function getAssignmentSort(sort?: string) {
  if (sort === "nip" || sort === "subject") {
    return sort;
  }

  return "teacher";
}

function getAssignmentSearchField(field?: string) {
  if (field === "nip" || field === "subject" || field === "teacher") {
    return field;
  }

  return "all";
}

function buildAssignmentWhere(
  query: string | undefined,
  field: "all" | "nip" | "subject" | "teacher",
): Prisma.SubjectTeacherWhereInput | undefined {
  if (!query) {
    return undefined;
  }

  if (field === "subject") {
    return {
      subject: {
        is: {
          name: {
            contains: query,
          },
        },
      },
    };
  }

  if (field === "teacher") {
    return {
      teacher: {
        is: {
          user: {
            is: {
              name: {
                contains: query,
              },
            },
          },
        },
      },
    };
  }

  if (field === "nip") {
    return {
      teacher: {
        is: {
          nip: {
            contains: query,
          },
        },
      },
    };
  }

  return {
    OR: [
      {
        subject: {
          is: {
            name: {
              contains: query,
            },
          },
        },
      },
      {
        teacher: {
          is: {
            user: {
              is: {
                name: {
                  contains: query,
                },
              },
            },
          },
        },
      },
      {
        teacher: {
          is: {
            nip: {
              contains: query,
            },
          },
        },
      },
    ],
  };
}

function getAssignmentOrderBy(sort: string, order: "asc" | "desc") {
  if (sort === "subject") {
    return {
      subject: {
        name: order,
      },
    } as const;
  }

  if (sort === "nip") {
    return {
      teacher: {
        nip: order,
      },
    } as const;
  }

  return {
    teacher: {
      user: {
        name: order,
      },
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
