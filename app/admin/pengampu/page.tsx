import {
  assignTeacherAction,
  deleteAssignmentAction,
} from "@/app/admin/_actions";
import {
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

type PengampuPageProps = {
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function PengampuAdminPage({
  searchParams,
}: PengampuPageProps) {
  const [teachers, subjects, assignments] = await Promise.all([
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
    prisma.subjectTeacher.findMany({
      include: {
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Administrasi Pengampu"
        title="Guru Pengampu Mata Pelajaran"
        description="Tetapkan guru pengampu untuk setiap mata pelajaran agar pengelolaan soal dan hasil tryout dapat dibatasi sesuai kewenangan."
      />

      <StatusAlert searchParams={searchParams} />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
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
                className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="grid gap-4">
            {assignments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                Belum ada penugasan guru pengampu.
              </p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-950">
                      {assignment.subject.name}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {assignment.teacher.user.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      NIP: {assignment.teacher.nip}
                    </p>
                  </div>

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
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
