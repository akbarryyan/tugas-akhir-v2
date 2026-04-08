"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMethod } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";

type AdminDashboardShellProps = {
  children: ReactNode;
  description: string;
  user: {
    authMethod: AuthMethod;
    email?: string | null;
    name?: string | null;
  };
};

const navigationItems = [
  { href: "/admin", label: "Beranda", description: "Ikhtisar data utama.", icon: HomeIcon },
  { href: "/admin/guru", label: "Guru", description: "Kelola akun dan identitas guru.", icon: TeacherIcon },
  { href: "/admin/siswa", label: "Siswa", description: "Atur data siswa dan NISN aktif.", icon: StudentIcon },
  { href: "/admin/mapel", label: "Mata Pelajaran", description: "Kelola daftar mata pelajaran.", icon: SubjectIcon },
  { href: "/admin/pengampu", label: "Guru Pengampu", description: "Tetapkan guru pengampu.", icon: AssignmentIcon },
];

const pageTitleByPath: Record<string, string> = {
  "/admin": "Beranda Administrasi",
  "/admin/guru": "Kelola Data Guru",
  "/admin/mapel": "Kelola Mata Pelajaran",
  "/admin/pengampu": "Kelola Guru Pengampu",
  "/admin/siswa": "Kelola Data Siswa",
};

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminDashboardShell({
  children,
  description,
  user,
}: AdminDashboardShellProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentTitle = pageTitleByPath[pathname] ?? "Panel Administrasi";
  const isCompactSidebar = isSidebarCollapsed && !isSidebarOpen;
  const sidebarWidth = isSidebarCollapsed ? "116px" : "292px";

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (storedValue === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.18),_transparent_28%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_22%,#f8fafc_100%)] text-slate-900">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup navigasi"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/55 opacity-100 backdrop-blur-[3px] transition-opacity duration-300 lg:hidden"
        />
      ) : null}

      <div
        className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 overflow-x-clip px-3 py-3 sm:px-5 sm:py-4 lg:grid lg:gap-6 lg:px-6 lg:py-6 lg:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ "--sidebar-width": sidebarWidth } as CSSProperties}
      >
        <aside
          className={`fixed inset-x-3 bottom-3 top-[6.25rem] z-[60] overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)] lg:max-h-none lg:w-auto lg:translate-x-0 lg:translate-y-0 lg:overflow-visible lg:shadow-[0_28px_80px_rgba(15,23,42,0.22)] ${
            isSidebarOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-[110%] opacity-0 lg:pointer-events-auto lg:opacity-100"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] bg-slate-950">
            <div
              className={`border-b border-white/10 pb-4 pt-4 transition-[padding] duration-200 ease-out sm:pb-5 sm:pt-6 ${
                isCompactSidebar ? "lg:px-4" : "px-5 sm:px-6 lg:px-6"
              }`}
            >
              <div className="mb-4 flex justify-center lg:hidden">
                <div className="h-1.5 w-14 rounded-full bg-white/20" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                    <span
                      className={`inline-block whitespace-nowrap transition-[opacity,max-width,transform] duration-200 ${
                        isCompactSidebar
                          ? "lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
                          : "max-w-[180px] translate-x-0 opacity-100"
                      }`}
                    >
                      Portal Admin
                    </span>
                  </div>

                  <div
                    className={`origin-top overflow-hidden transition-[max-height,opacity,transform,margin] duration-200 ease-out ${
                      isCompactSidebar
                        ? "lg:mt-0 lg:max-h-0 lg:-translate-y-2 lg:opacity-0"
                        : "mt-5 max-h-52 translate-y-0 opacity-100"
                    }`}
                  >
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                      Pengelolaan Sekolah
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12 lg:hidden"
                  >
                    <CloseIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed((current) => !current)}
                    title={isSidebarCollapsed ? "Buka sidebar" : "Ringkas sidebar"}
                    className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12 lg:inline-flex"
                  >
                    {isSidebarCollapsed ? <ExpandIcon /> : <CollapseIcon />}
                  </button>
                </div>
              </div>

              <div
                className={`hidden justify-center overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out lg:flex ${
                  isCompactSidebar
                    ? "lg:mt-3 lg:max-h-16 lg:opacity-100"
                    : "lg:mt-0 lg:max-h-0 lg:opacity-0"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
                  <SchoolIcon />
                </div>
              </div>
            </div>

            <div
              className={`flex min-h-0 flex-1 flex-col py-3 transition-[padding] duration-200 ease-out sm:py-4 ${
                isCompactSidebar ? "lg:px-3" : "px-4 lg:px-4"
              }`}
            >
              <div
                className={`px-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 ${
                  isCompactSidebar ? "lg:text-center" : ""
                }`}
              >
                {isCompactSidebar ? "Menu" : "Navigasi Utama"}
              </div>

              <nav className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-4">
                <div className="grid gap-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href));

                    return (
                      <div key={item.href} className="group relative">
                        {isCompactSidebar ? (
                          <Link
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            title={item.label}
                            className={`flex h-14 items-center justify-center rounded-[1.35rem] transition-all duration-200 ${
                              isActive
                                ? "bg-white text-slate-950 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                                : "text-slate-300 hover:bg-white/8 hover:text-white"
                            }`}
                          >
                            <span
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                                isActive
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-white/8 text-slate-200 group-hover:bg-white/12"
                              }`}
                            >
                              <Icon />
                            </span>
                          </Link>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex min-w-0 gap-3 rounded-[1.35rem] px-3.5 py-3 transition-all duration-200 sm:px-4 ${
                              isActive
                                ? "bg-white text-slate-950 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                                : "text-slate-300 hover:bg-white/8 hover:text-white"
                            }`}
                          >
                            <span
                              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                                isActive
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-white/8 text-slate-200 group-hover:bg-white/12"
                              }`}
                            >
                              <Icon />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                {item.label}
                              </span>
                              <span
                                className={`mt-1 block text-xs leading-5 ${
                                  isActive ? "text-slate-600" : "text-slate-400"
                                }`}
                              >
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        )}

                        {isCompactSidebar ? (
                          <div className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 hidden -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 opacity-0 shadow-[0_18px_44px_rgba(15,23,42,0.14)] transition-all duration-150 group-hover:translate-x-1 group-hover:opacity-100 lg:block">
                            {item.label}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </nav>
            </div>

            <div className="shrink-0 border-t border-white/10 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              <SignOutButton
                className={`w-full rounded-full border border-white/12 bg-white/8 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCompactSidebar ? "lg:px-0" : "px-4"
                }`}
                pendingLabel="Keluar..."
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div
            className={`sticky top-0 isolate pb-3 pt-3 lg:pb-4 lg:pt-6 ${
              isSidebarOpen ? "z-20 lg:z-30" : "z-30"
            }`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.18),_transparent_28%),linear-gradient(180deg,#eef2ff_0%,#f8fafc_22%,#f8fafc_100%)] lg:h-6" />
            <header
              className={`relative rounded-[1.45rem] border border-slate-200/90 bg-white px-4 py-3.5 transition-shadow duration-200 sm:px-5 sm:py-4 ${
                isScrolled
                  ? "shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  : "shadow-none"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition hover:border-indigo-200 hover:text-indigo-700 lg:hidden"
                    >
                      <MenuIcon />
                    </button>
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600 sm:text-xs">
                      Panel Administrasi
                    </p>
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                    {currentTitle}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Kelola data inti sekolah melalui navigasi di samping dan pantau perubahan dari setiap halaman kerja.
                  </p>
                </div>

                <div className="flex w-full min-w-0 items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-3.5 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:px-4 md:w-auto">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)] sm:h-11 sm:w-11">
                    {(user.name ?? "A").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {user.name ?? "Administrator"}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      Administrator Sekolah
                    </p>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <main className="relative z-0 min-w-0 overflow-x-clip pb-4 pt-4 lg:pt-4">
            {children}
          </main>
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

function HomeIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" />
      <path d="M7 10.5V14c0 1.7 2.2 3 5 3s5-1.3 5-3v-3.5" />
      <path d="M20 8v6" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 19.5c1.2-2.5 3.8-4 7-4s5.8 1.5 7 4" />
    </svg>
  );
}

function SubjectIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M6 5.5h10.5A1.5 1.5 0 0 1 18 7v11.5L14 16l-4 2.5V7A1.5 1.5 0 0 0 8.5 5.5H6Z" />
      <path d="M8.5 5.5A1.5 1.5 0 0 0 7 7v11.5" />
    </svg>
  );
}

function AssignmentIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M8 7h11" />
      <path d="M8 12h11" />
      <path d="M8 17h11" />
      <path d="M4.5 7h.01" />
      <path d="M4.5 12h.01" />
      <path d="M4.5 17h.01" />
    </svg>
  );
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

function CollapseIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M15 5 9 12l6 7" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="m9 5 6 7-6 7" />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M3.5 9 12 4l8.5 5-8.5 5-8.5-5Z" />
      <path d="M6 11.5V16c0 1.8 2.7 3.5 6 3.5s6-1.7 6-3.5v-4.5" />
    </svg>
  );
}
