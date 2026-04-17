"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMethod } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";

type TeacherDashboardShellProps = {
  children: ReactNode;
  description: string;
  user: {
    authMethod: AuthMethod;
    email?: string | null;
    name?: string | null;
  };
};

const navigationItems = [
  {
    href: "/guru",
    label: "Beranda",
    helper: "Ringkasan area kerja guru.",
  },
  {
    href: "/guru/soal",
    label: "Kelola Soal",
    helper: "Kelola soal mentah per mapel.",
  },
  {
    href: "/guru/bank-soal",
    label: "Bank Soal",
    helper: "Susun koleksi soal siap pakai.",
  },
  {
    href: "/guru/tryout",
    label: "Tryout",
    helper: "Susun dan kelola paket tryout.",
  },
];

const pageTitleByPath: Record<string, string> = {
  "/guru": "Beranda Guru",
  "/guru/soal": "Kelola Soal",
  "/guru/bank-soal": "Pengelolaan Bank Soal",
  "/guru/tryout": "Pengelolaan Tryout",
};

export function TeacherDashboardShell({
  children,
  description,
  user,
}: TeacherDashboardShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const teacherName = user.name ?? "Guru";

  const currentPageTitle = pathname.startsWith("/guru/tryout/")
    ? "Detail Tryout Guru"
    : pathname.startsWith("/guru/bank-soal")
      ? "Pengelolaan Bank Soal"
    : pathname.startsWith("/guru/soal")
      ? "Kelola Soal"
    : (pageTitleByPath[pathname] ?? "Area Guru");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(180deg,#f7fafc_0%,#eef4ff_44%,#f8fafc_100%)] text-slate-900">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu guru"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-[1520px] gap-4 overflow-x-clip px-3 py-3 sm:px-5 sm:py-4 lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-6">
        <aside
          className={`fixed inset-y-3 left-3 z-50 w-[min(325px,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#0f172a_0%,#0b1222_44%,#111827_100%)] text-white shadow-[0_28px_72px_rgba(15,23,42,0.36)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:w-auto lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-[108%] lg:translate-x-0"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/10 px-5 pb-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-4">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
                    Ruang Guru
                  </span>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                      {teacherName}
                    </h1>
                    <p className="text-sm leading-6 text-slate-300">{description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                  Identitas Akses
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {user.authMethod === AuthMethod.EMAIL_PASSWORD
                    ? "Akun Guru"
                    : "Akses Portal"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {user.email ?? "Akun guru aktif pada portal pembelajaran."}
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Navigasi Guru
              </p>

              <nav className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-2.5">
                  {navigationItems.map((item) => {
                    const isActive =
                      item.href === "/guru"
                        ? pathname === "/guru"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`group rounded-[1.45rem] border px-4 py-3 transition ${
                          isActive
                            ? "border-sky-400/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.22),rgba(14,165,233,0.14))] text-white shadow-[0_14px_30px_rgba(14,165,233,0.15)]"
                            : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                              isActive
                                ? "bg-white/14 text-sky-100"
                                : "bg-white/6 text-slate-300 group-hover:bg-white/10 group-hover:text-white"
                            }`}
                          >
                            {item.href === "/guru" ? (
                              <TeacherHomeIcon />
                            ) : item.href === "/guru/soal" ? (
                              <TeacherQuestionIcon />
                            ) : item.href === "/guru/bank-soal" ? (
                              <TeacherBankIcon />
                            ) : (
                              <TeacherTryoutIcon />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{item.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                              {item.helper}
                            </span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <SignOutButton
                className="w-full rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
                confirmTitle="Keluar dari Area Guru"
                pendingLabel="Keluar..."
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-30 isolate pb-3 pt-3 lg:pb-4 lg:pt-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(180deg,#f7fafc_0%,#eef4ff_44%,#f8fafc_100%)] lg:h-6" />
            <header className="relative rounded-[1.8rem] border border-white/90 bg-white px-4 py-4 shadow-[0_18px_52px_rgba(15,23,42,0.08)] sm:px-5 sm:py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:border-sky-200 hover:text-sky-700 lg:hidden"
                    >
                      <MenuIcon />
                    </button>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 sm:text-xs">
                      Panel Guru
                    </p>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {currentPageTitle}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">
                    Kelola perangkat evaluasi pembelajaran, susun tryout dengan lebih tertata, dan pantau progres yang relevan dengan mata pelajaran yang Anda ampu.
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto xl:justify-end">
                  <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                    Fokus akademik
                  </div>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                    Susun evaluasi yang siap dipakai
                  </div>
                </div>
              </div>
            </header>
          </div>

          <main className="min-w-0 overflow-x-clip pb-4 pt-4 lg:pt-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

function iconProps() {
  return {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
  };
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function TeacherHomeIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5v9h11v-9" />
      <path d="M10 18.5v-5h4v5" />
    </svg>
  );
}

function TeacherTryoutIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M8 5.5h8" />
      <path d="M8 9.5h8" />
      <path d="M8 13.5h5" />
      <path d="M5.5 5.5h.01" />
      <path d="M5.5 9.5h.01" />
      <path d="M5.5 13.5h.01" />
      <path d="M4 3.5h16v17H4z" />
    </svg>
  );
}

function TeacherQuestionIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M12 18h.01" />
      <path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1.2-1.9 1.7-2.4 2.6-.2.4-.3.7-.3 1.4" />
      <path d="M4 4h16v16H4z" />
    </svg>
  );
}

function TeacherBankIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M4 7.5 12 4l8 3.5L12 11z" />
      <path d="M4 12.5 12 16l8-3.5" />
      <path d="M4 17.5 12 21l8-3.5" />
      <path d="M4 7.5v10" />
      <path d="M20 7.5v10" />
    </svg>
  );
}
