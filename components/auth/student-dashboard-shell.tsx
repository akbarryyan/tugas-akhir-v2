"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMethod } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";

type StudentDashboardShellProps = {
  children: ReactNode;
  description: string;
  user: {
    authMethod: AuthMethod;
    email?: string | null;
    name?: string | null;
  };
};

const navigationItems = [
  { href: "/siswa", label: "Beranda", helper: "Lihat ringkasan belajar." },
  { href: "/siswa#tryout", label: "Tryout", helper: "Mulai latihan yang tersedia." },
  { href: "/siswa#hasil", label: "Hasil", helper: "Cek nilai terbaru." },
  { href: "/siswa#tanggapan", label: "Tanggapan", helper: "Isi umpan balik setelah tryout." },
];

export function StudentDashboardShell({
  children,
  description,
  user,
}: StudentDashboardShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const studentName = user.name ?? "Siswa";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.32),_transparent_32%),linear-gradient(180deg,#f5fbff_0%,#eff6ff_45%,#f8fafc_100%)] text-slate-900">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu siswa"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] gap-4 overflow-x-clip px-3 py-3 sm:px-5 sm:py-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-6">
        <aside
          className={`fixed inset-y-3 left-3 z-50 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbff_100%)] shadow-[0_24px_64px_rgba(14,116,144,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:w-auto lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-[108%] lg:translate-x-0"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-sky-100 px-5 pb-5 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-4">
                  <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                    Portal Siswa
                  </span>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {studentName}
                    </h1>
                    <p className="text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-100 bg-white text-slate-500 transition hover:border-sky-200 hover:text-sky-700 lg:hidden"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] bg-[linear-gradient(135deg,#e0f2fe_0%,#eff6ff_55%,#ffffff_100%)] p-4 shadow-inner shadow-white/70">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Metode Masuk
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {user.authMethod === AuthMethod.NISN ? "NISN Siswa" : "Akun Portal"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Gunakan area ini untuk mengikuti tryout, melihat hasil, dan mengisi tanggapan belajar.
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Menu Belajar
              </p>

              <nav className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-2">
                  {navigationItems.map((item) => {
                    const isActive =
                      item.href === "/siswa"
                        ? pathname === "/siswa"
                        : pathname === "/siswa";

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`group rounded-[1.4rem] border px-4 py-3 transition ${
                          isActive && item.href === "/siswa"
                            ? "border-sky-200 bg-white text-slate-950 shadow-[0_12px_32px_rgba(14,116,144,0.1)]"
                            : "border-transparent bg-transparent text-slate-600 hover:border-sky-100 hover:bg-white/80 hover:text-slate-950"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                              isActive && item.href === "/siswa"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-700"
                            }`}
                          >
                            <StudentNavIcon />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{item.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
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

            <div className="border-t border-sky-100 px-4 py-4">
              <SignOutButton
                className="w-full rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                confirmTitle="Keluar dari Area Siswa"
                pendingLabel="Keluar..."
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="sticky top-0 z-30 isolate pb-3 pt-3 lg:pb-4 lg:pt-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.32),_transparent_32%),linear-gradient(180deg,#f5fbff_0%,#eff6ff_45%,#f8fafc_100%)] lg:h-6" />
            <header className="relative rounded-[1.8rem] border border-white/90 bg-white px-4 py-4 shadow-[0_18px_48px_rgba(14,116,144,0.08)] sm:px-5 sm:py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-100 bg-white text-slate-700 shadow-[0_8px_20px_rgba(14,116,144,0.08)] transition hover:border-sky-200 hover:text-sky-700 lg:hidden"
                    >
                      <MenuIcon />
                    </button>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 sm:text-xs">
                      Area Belajar
                    </p>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    Selamat datang, {studentName}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">
                    Pilih tryout yang tersedia, cek hasilnya setelah selesai, lalu isi tanggapanmu dengan bahasa yang santun dan jelas.
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                  <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                    Fokus hari ini
                  </div>
                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                    Ikuti tryout sesuai jadwal
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

function StudentNavIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 19.5c1.2-2.5 3.8-4 7-4s5.8 1.5 7 4" />
    </svg>
  );
}
