import Link from "next/link";

import { prisma } from "@/lib/db/prisma";

export default async function AdminPage() {
  const [
    teacherCount,
    studentCount,
    subjectCount,
    assignmentCount,
    tryoutStatusGroups,
    assignedSubjectGroups,
    sentimentSourceGroups,
  ] = await Promise.all([
    prisma.teacherProfile.count(),
    prisma.studentProfile.count(),
    prisma.subject.count(),
    prisma.subjectTeacher.count(),
    prisma.tryout.groupBy({ by: ["isPublished"], _count: { _all: true } }),
    prisma.subjectTeacher.groupBy({ by: ["subjectId"] }),
    prisma.sentimentAnalysis.groupBy({ by: ["labelSource"], _count: { _all: true } }),
  ]);

  const tryoutCount = tryoutStatusGroups.reduce((sum, g) => sum + g._count._all, 0);
  const publishedTryoutCount =
    tryoutStatusGroups.find((g) => g.isPublished === true)?._count._all ?? 0;
  const analyzedFeedbackCount = sentimentSourceGroups.reduce((sum, g) => sum + g._count._all, 0);
  const manualReviewedSentimentCount =
    sentimentSourceGroups.find((g) => g.labelSource === "MANUAL")?._count._all ?? 0;

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
      note: "Pantau penugasan guru pada tiap mata pelajaran dan kelas yang diampu.",
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
    {
      href: "/admin/feedback",
      label: "Review Sentimen",
      note: "Tinjau auto-label umpan balik siswa terhadap pembelajaran dan lakukan koreksi manual jika diperlukan.",
      total: analyzedFeedbackCount,
      unit: "umpan balik",
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
    {
      label: "Review Sentimen",
      value: `${manualReviewedSentimentCount} manual`,
      meta: `${Math.max(0, analyzedFeedbackCount - manualReviewedSentimentCount)} umpan balik masih otomatis`,
      tone: "from-violet-500/15 to-fuchsia-400/10 text-violet-700",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.42fr]">
        <div className="overflow-hidden rounded-[1.85rem] border border-slate-200/80 bg-[linear-gradient(135deg,#5f72ff_0%,#6ca5ff_48%,#7ed4c8_100%)] p-6 text-white shadow-[0_22px_54px_rgba(99,102,241,0.18)]">
          <p className="text-sm font-medium text-white/75">Akun Terkelola</p>
          <p className="mt-3 text-[2.4rem] font-semibold tracking-tight">{totalManagedUsers}</p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-white/80">
            Kelola pengguna aktif, data akademik, dan tryout dari satu panel administrasi yang lebih cepat dipindai.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/guru"
              className="inline-flex items-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-[0_10px_22px_rgba(255,255,255,0.22)] transition hover:translate-y-[-1px]"
            >
              Lihat Pengguna
            </Link>
            <Link
              href="/admin/tryout"
              className="inline-flex items-center rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Pantau Tryout
            </Link>
            <Link
              href="/admin/feedback"
              className="inline-flex items-center rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Review Sentimen
            </Link>
          </div>
        </div>

        <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Statistik</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                Diperbarui untuk ringkasan admin
              </p>
            </div>
            <span className="text-xs text-slate-400">Snapshot langsung</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStatCard
              accent="indigo"
              label="Guru"
              helper="Pengajar aktif"
              value={teacherCount}
            />
            <MetricStatCard
              accent="emerald"
              label="Siswa"
              helper="Akses belajar"
              value={studentCount}
            />
            <MetricStatCard
              accent="amber"
              label="Tryout"
              helper="Paket tersedia"
              value={tryoutCount}
            />
            <MetricStatCard
              accent="sky"
              label="Mapel"
              helper="Subjek aktif"
              value={subjectCount}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Laporan Cakupan</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    Guru pengampu dan kesiapan mapel
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {coveragePercent}%
                </span>
              </div>

              <div className="mt-6 grid h-[220px] grid-cols-6 items-end gap-3">
                {[
                  Math.max(18, coveragePercent - 24),
                  Math.max(22, coveragePercent - 8),
                  Math.max(16, coveragePercent - 30),
                  Math.max(26, coveragePercent),
                  Math.max(18, coveragePercent - 16),
                  Math.max(20, coveragePercent - 6),
                ].map((value, index) => (
                  <div key={index} className="flex flex-col items-center gap-3">
                    <div className="flex h-[180px] items-end">
                      <div
                        className={`w-8 rounded-full ${
                          index % 2 === 0 ? "bg-indigo-500/85" : "bg-emerald-400/85"
                        }`}
                        style={{ height: `${Math.min(100, value)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-semibold text-slate-900">Status Tryout</p>
                <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">
                  {publishedTryoutCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Paket yang sudah dipublikasikan untuk siswa.
                </p>
                <div className="mt-5 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#60a5fa_100%)]"
                    style={{
                      width: `${tryoutCount === 0 ? 0 : Math.max(12, Math.round((publishedTryoutCount / tryoutCount) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-400">{draftTryoutCount} draft menunggu review</p>
              </div>

              <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <p className="text-sm font-semibold text-slate-900">Relasi Pengampu</p>
                <p className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950">
                  {assignmentCount}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Relasi pengampu yang sudah aktif di sistem.
                </p>
                <div className="mt-5 grid grid-cols-5 items-end gap-2">
                  {[58, 84, 46, 78, 92].map((bar, index) => (
                    <div key={index} className="h-24 rounded-full bg-slate-100 p-1">
                      <div
                        className="w-full rounded-full bg-emerald-400"
                        style={{ height: `${bar}%`, marginTop: `${100 - bar}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.85rem] border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Laporan Modul</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                  Modul administrasi utama
                </p>
              </div>
              <Link
                href="/admin/tryout"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Lihat Monitoring
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
        </div>

        <div className="grid gap-5">
          <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-900">Pengingat</p>
            <div className="mt-5 grid gap-4">
              <FocusItem
                title="Validasi data guru dan siswa"
                description="Pastikan akun aktif benar-benar sesuai kebutuhan operasional sekolah."
              />
              <FocusItem
                title="Lengkapi pengampu mapel"
                description="Mapel tanpa pengampu akan menghambat alur bank soal dan tryout."
              />
              <FocusItem
                title="Pantau tryout aktif"
                description="Tinjau paket yang sudah dipublikasikan agar siap digunakan siswa."
              />
            </div>
          </div>

          <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-900">Ikhtisar Target</p>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[10px] border-slate-100">
                <div
                  className="absolute inset-0 rounded-full border-[10px] border-transparent border-t-indigo-500 border-r-indigo-400"
                  style={{ transform: `rotate(${Math.max(18, coveragePercent * 3.2)}deg)` }}
                />
                <div className="text-center">
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">
                    {coveragePercent}%
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    Pengampu aktif
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-[1.3rem] bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Selesai</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{assignedSubjectCount}</p>
              </div>
              <div className="rounded-[1.3rem] bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Sisa</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{remainingSubjects}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.85rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-900">Statistik Ringkas</p>
            <div className="mt-5 space-y-4">
              {spotlightItems.map((item) => (
                <AnalyticsRow
                  key={item.label}
                  color={item.label === "Pengguna Terkelola" ? "bg-indigo-400" : item.label === "Cakupan Pengampu" ? "bg-emerald-400" : "bg-amber-400"}
                  label={item.label}
                  value={Number.parseInt(item.value, 10) || 0}
                  width={
                    item.label === "Pengguna Terkelola"
                      ? 68
                      : item.label === "Cakupan Pengampu"
                        ? Math.max(18, coveragePercent)
                        : tryoutCount === 0
                          ? 12
                          : Math.max(12, Math.round((publishedTryoutCount / tryoutCount) * 100))
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricStatCard({
  accent,
  helper,
  label,
  value,
}: {
  accent: "amber" | "emerald" | "indigo" | "sky";
  helper: string;
  label: string;
  value: number;
}) {
  const accentClass =
    accent === "amber"
      ? "bg-amber-100 text-amber-700"
      : accent === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : accent === "sky"
          ? "bg-sky-100 text-sky-700"
          : "bg-indigo-100 text-indigo-700";

  return (
    <div className="rounded-[1.45rem] border border-slate-200/80 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accentClass}`}>
          <InsightIcon />
        </span>
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Stat</span>
      </div>
      <p className="mt-4 text-[1.65rem] font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p>
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
