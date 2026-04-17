import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

export default async function AdminPage() {
  const [
    teacherCount,
    studentCount,
    subjectCount,
    assignmentCount,
    tryoutCount,
    publishedTryoutCount,
    assignedSubjectGroups,
  ] = await Promise.all([
    prisma.teacherProfile.count(),
    prisma.studentProfile.count(),
    prisma.subject.count(),
    prisma.subjectTeacher.count(),
    prisma.tryout.count(),
    prisma.tryout.count({
      where: {
        isPublished: true,
      },
    }),
    prisma.subjectTeacher.groupBy({
      by: ["subjectId"],
    }),
  ]);

  const totalManagedUsers = teacherCount + studentCount;
  const draftTryoutCount = Math.max(0, tryoutCount - publishedTryoutCount);
  const assignedSubjectCount = assignedSubjectGroups.length;
  const coveragePercent =
    subjectCount === 0 ? 0 : Math.min(100, Math.round((assignedSubjectCount / subjectCount) * 100));
  const remainingSubjects = Math.max(0, subjectCount - assignedSubjectCount);

  const summaryRows = [
    {
      href: "/admin/guru",
      label: "Data Guru",
      note: "Kelola akun guru, identitas pengajar, dan kesiapan peran di sistem.",
      total: teacherCount,
      unit: "akun",
    },
    {
      href: "/admin/siswa",
      label: "Data Siswa",
      note: "Pantau data siswa aktif dan NISN yang digunakan untuk akses masuk.",
      total: studentCount,
      unit: "akun",
    },
    {
      href: "/admin/mapel",
      label: "Mata Pelajaran",
      note: "Atur mata pelajaran yang dipakai pada bank soal, tryout, dan evaluasi.",
      total: subjectCount,
      unit: "mapel",
    },
    {
      href: "/admin/pengampu",
      label: "Guru Pengampu",
      note: "Pantau kecocokan relasi guru dengan mata pelajaran yang diampu.",
      total: assignmentCount,
      unit: "relasi",
    },
    {
      href: "/admin/tryout",
      label: "Tryout",
      note: "Tinjau paket tryout yang masih draft maupun yang sudah dipublikasikan.",
      total: tryoutCount,
      unit: "paket",
    },
  ];

  const spotlightItems = [
    {
      label: "Pengguna Terkelola",
      value: `${totalManagedUsers} akun`,
      meta: `${teacherCount} guru • ${studentCount} siswa`,
      tone: "from-indigo-500/15 to-sky-400/10 text-indigo-700",
    },
    {
      label: "Cakupan Pengampu",
      value: `${coveragePercent}%`,
      meta:
        remainingSubjects > 0
          ? `${remainingSubjects} mapel belum punya pengampu`
          : "Seluruh mapel sudah memiliki pengampu",
      tone: "from-emerald-500/15 to-teal-400/10 text-emerald-700",
    },
    {
      label: "Status Tryout",
      value: `${publishedTryoutCount} aktif`,
      meta: `${draftTryoutCount} draft menunggu peninjauan`,
      tone: "from-amber-500/15 to-orange-400/10 text-amber-700",
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.48fr]">
        <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(248,250,252,0.92)_100%)] p-6 shadow-[0_26px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Akun Terkelola</p>
              <p className="mt-3 text-[2.35rem] font-semibold tracking-tight text-slate-950">
                {totalManagedUsers}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Admin Overview
            </span>
          </div>

          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
            Pantau pengguna aktif, kelola data utama sekolah, dan arahkan administrasi operasional dari satu dashboard yang lebih terstruktur.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/guru"
              className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#5f72ff_0%,#7184ff_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(95,114,255,0.28)] transition hover:translate-y-[-1px]"
            >
              Kelola Guru
            </Link>
            <Link
              href="/admin/siswa"
              className="inline-flex items-center rounded-2xl bg-[linear-gradient(135deg,#64748b_0%,#475569_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(71,85,105,0.2)] transition hover:translate-y-[-1px]"
            >
              Kelola Siswa
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniOverviewCard
              label="Akun Guru"
              value={teacherCount}
              helper="Pengajar aktif yang mengelola soal dan tryout."
            />
            <MiniOverviewCard
              label="Akun Siswa"
              value={studentCount}
              helper="Siswa aktif yang dapat mengikuti tryout."
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_26px_60px_rgba(15,23,42,0.08)]">
          <div className="grid border-b border-slate-200/80 lg:grid-cols-2">
            <InsightTile
              accent="indigo"
              label="Tryout Dipublikasikan"
              value={publishedTryoutCount}
              detail={`${draftTryoutCount} paket masih berada pada status draft.`}
            />
            <InsightTile
              accent="sky"
              label="Mata Pelajaran Aktif"
              value={subjectCount}
              detail={`${assignedSubjectCount} mapel sudah memiliki guru pengampu.`}
            />
          </div>

          <div className="grid lg:grid-cols-2">
            <div className="border-b border-slate-200/80 p-6 lg:border-b-0 lg:border-r">
              <p className="text-sm font-medium text-slate-400">Cakupan Pengampu</p>
              <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">
                {coveragePercent}%
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Proporsi mata pelajaran yang sudah terhubung dengan guru pengampu.
              </p>

              <div className="mt-5 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#5f72ff_0%,#7c90ff_100%)]"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                <span>{assignedSubjectCount} sudah terhubung</span>
                <span>{remainingSubjects} belum terhubung</span>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm font-medium text-slate-400">Distribusi Ringkas</p>
              <div className="mt-5 space-y-4">
                <AnalyticsRow
                  color="bg-pink-300"
                  label="Guru"
                  value={teacherCount}
                  width={totalManagedUsers === 0 ? 0 : Math.max(12, Math.round((teacherCount / totalManagedUsers) * 100))}
                />
                <AnalyticsRow
                  color="bg-violet-300"
                  label="Siswa"
                  value={studentCount}
                  width={totalManagedUsers === 0 ? 0 : Math.max(12, Math.round((studentCount / totalManagedUsers) * 100))}
                />
                <AnalyticsRow
                  color="bg-sky-300"
                  label="Tryout Aktif"
                  value={publishedTryoutCount}
                  width={tryoutCount === 0 ? 0 : Math.max(12, Math.round((publishedTryoutCount / tryoutCount) * 100))}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
                Ringkasan Data
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Data Utama Administrasi
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Tinjau setiap area pengelolaan utama dan buka halaman terkait untuk melanjutkan pekerjaan administrasi.
              </p>
            </div>
            <Link
              href="/admin/tryout"
              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              Lihat Monitoring Tryout
            </Link>
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-[1.1fr_2fr_0.7fr_auto] gap-4 bg-slate-50/85 px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span>Modul</span>
              <span>Deskripsi</span>
              <span>Total</span>
              <span className="text-right">Aksi</span>
            </div>
            <div className="divide-y divide-slate-200/80">
              {summaryRows.map((row) => (
                <div
                  key={row.href}
                  className="grid grid-cols-[1.1fr_2fr_0.7fr_auto] items-center gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{row.label}</p>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{row.note}</p>
                  <p className="text-sm font-semibold text-slate-950">
                    {row.total} {row.unit}
                  </p>
                  <div className="text-right">
                    <Link
                      href={row.href}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                    >
                      Buka
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 lg:hidden">
            {summaryRows.map((row) => (
              <div
                key={row.href}
                className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-950">{row.label}</h3>
                    <p className="text-sm leading-6 text-slate-600">{row.note}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                    {row.total} {row.unit}
                  </span>
                </div>
                <div className="mt-4">
                  <Link
                    href={row.href}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    Buka Modul
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Sorotan Operasional
            </p>
            <div className="mt-5 grid gap-4">
              {spotlightItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${item.tone} p-4`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Fokus Administrasi
            </p>
            <div className="mt-5 space-y-4">
              <FocusItem
                title="Validasi data guru dan siswa"
                description="Pastikan akun yang aktif benar-benar sesuai dengan kebutuhan operasional sekolah."
              />
              <FocusItem
                title="Lengkapi pengampu mapel"
                description="Mata pelajaran tanpa pengampu akan menghambat alur bank soal dan tryout."
              />
              <FocusItem
                title="Pantau tryout aktif"
                description="Tinjau paket yang sudah dipublikasikan agar siap digunakan siswa."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniOverviewCard({
  helper,
  label,
  value,
}: {
  helper: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function InsightTile({
  accent,
  detail,
  label,
  value,
}: {
  accent: "indigo" | "sky";
  detail: string;
  label: string;
  value: number;
}) {
  const iconTone =
    accent === "indigo"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-sky-100 text-sky-700";

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{detail}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${iconTone}`}>
          <InsightIcon />
        </span>
      </div>
    </div>
  );
}

function AnalyticsRow({
  color,
  label,
  value,
  width,
}: {
  color: string;
  label: string;
  value: number;
  width: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span>{label}</span>
        </div>
        <span className="font-semibold text-slate-950">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function FocusItem({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/75 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InsightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M6.5 16.5V11" />
      <path d="M12 16.5V7.5" />
      <path d="M17.5 16.5v-4" />
      <path d="M4 19.5h16" />
    </svg>
  );
}
