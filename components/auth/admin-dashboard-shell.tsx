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
  { href: "/admin/tryout", label: "Tryout", description: "Pantau paket tryout yang tersedia.", icon: ClipboardIcon },
  { href: "/admin/pengampu", label: "Guru Pengampu", description: "Tetapkan guru pengampu.", icon: AssignmentIcon },
];

const pageTitleByPath: Record<string, string> = {
  "/admin": "Beranda Administrasi",
  "/admin/guru": "Kelola Data Guru",
  "/admin/mapel": "Kelola Mata Pelajaran",
  "/admin/pengampu": "Kelola Guru Pengampu",
  "/admin/siswa": "Kelola Data Siswa",
  "/admin/tryout": "Pantau Data Tryout",
};

const headerTabs = [
  {
    href: "/admin",
    label: "Dashboard",
    matches: (pathname: string) => pathname === "/admin",
  },
  {
    href: "/admin/guru",
    label: "Pengguna",
    matches: (pathname: string) =>
      pathname.startsWith("/admin/guru") || pathname.startsWith("/admin/siswa"),
  },
  {
    href: "/admin/mapel",
    label: "Akademik",
    matches: (pathname: string) =>
      pathname.startsWith("/admin/mapel") || pathname.startsWith("/admin/pengampu"),
  },
  {
    href: "/admin/tryout",
    label: "Tryout",
    matches: (pathname: string) => pathname.startsWith("/admin/tryout"),
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminDashboardShell({
  children,
  description,
  user,
}: AdminDashboardShellProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentTitle = pageTitleByPath[pathname] ?? "Panel Administrasi";
  const isDashboardHome = pathname === "/admin";
  const isCompactSidebar = isSidebarCollapsed && !isSidebarOpen;
  const sidebarWidth = isSidebarCollapsed ? "116px" : "292px";

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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
    <div className="relative min-h-screen overflow-x-clip bg-[#f3f5fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[linear-gradient(135deg,#161d33_0%,#222b48_52%,#1a2747_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_82%_28%,rgba(99,102,241,0.34)_0,transparent_20%),radial-gradient(circle_at_90%_70%,rgba(96,165,250,0.22)_0,transparent_25%),radial-gradient(circle,rgba(165,180,252,0.75)_1.15px,transparent_1.15px)] bg-[length:auto,auto,12px_12px] opacity-50 [mask-image:linear-gradient(180deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.18)_76%,rgba(0,0,0,0)_100%)]" />
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

        <div className="relative z-10 min-w-0">
          <div
            className={`sticky top-3 isolate pb-6 sm:top-4 sm:pb-7 lg:top-6 lg:pb-12 ${
              isSidebarOpen ? "z-20 lg:z-30" : "z-30"
            }`}
          >
            <header
              className={`relative overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(21,29,50,0.98),rgba(31,44,74,0.96))] px-4 text-white transition-[padding,box-shadow,border-radius] duration-300 sm:rounded-[1.8rem] sm:px-5 ${
                isScrolled ? "rounded-[1.55rem]" : "rounded-[1.8rem]"
              } ${
                isScrolled ? "py-1.5 sm:py-5" : "py-3.5 sm:py-5"
              } ${
                isScrolled
                  ? "shadow-[0_20px_44px_rgba(15,23,42,0.24)]"
                  : "shadow-[0_16px_32px_rgba(15,23,42,0.14)]"
              }`}
            >
              <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] bg-[radial-gradient(circle_at_80%_32%,rgba(99,102,241,0.45)_0,transparent_28%),radial-gradient(circle_at_88%_72%,rgba(96,165,250,0.24)_0,transparent_26%),radial-gradient(circle,rgba(129,140,248,0.65)_1.05px,transparent_1.05px)] bg-[length:auto,auto,12px_12px] opacity-55 [mask-image:linear-gradient(90deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.95)_20%,rgba(0,0,0,0.8)_100%)]" />

              <div
                className={`relative flex flex-col transition-[gap] duration-300 ${
                  isScrolled ? "gap-0.5 sm:gap-5" : "gap-4 sm:gap-5"
                }`}
              >
                <div
                  className={`flex flex-col xl:flex-row xl:justify-between ${
                    isScrolled ? "gap-2 sm:gap-4" : "gap-4"
                  }`}
                >
                  <div
                    className={`min-w-0 ${
                      isScrolled ? "space-y-0 sm:space-y-4" : "space-y-3 sm:space-y-4"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between lg:block ${
                        isScrolled ? "gap-2 md:gap-3" : "gap-3"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className={`inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-100 transition-all duration-300 hover:bg-white/12 lg:hidden ${
                          isScrolled ? "h-9 w-9" : "h-11 w-11"
                        }`}
                      >
                        <MenuIcon />
                      </button>

                      <div
                        className={`flex min-w-0 items-center self-center ${
                          isScrolled ? "gap-2 md:gap-3" : "gap-3"
                        }`}
                      >
                        <div
                          className={`flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6_0%,#6366f1_52%,#60a5fa_100%)] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(99,102,241,0.35)] transition-all duration-300 lg:hidden ${
                            isScrolled ? "h-9 w-9 text-[13px]" : "h-11 w-11"
                          }`}
                        >
                          {(user.name ?? "A").slice(0, 1).toUpperCase()}
                        </div>
                        <button
                          type="button"
                          className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-slate-100 transition-all duration-300 hover:bg-white/12 md:hidden ${
                            isScrolled ? "h-9 w-9" : "h-11 w-11"
                          }`}
                        >
                          <BellIcon />
                        </button>
                      </div>
                    </div>

                    <div
                      className={`overflow-hidden transition-[max-height,opacity,transform,margin] duration-300 ease-out ${
                        isScrolled
                          ? "max-h-0 -translate-y-2 opacity-0 md:mt-0 md:max-h-20 md:translate-y-0 md:opacity-100"
                          : "max-h-16 translate-y-0 opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-200 sm:text-xs">
                          Panel Administrasi
                        </p>
                        <div className="hidden h-px w-14 bg-white/14 lg:block" />
                      </div>
                    </div>

                    <div
                      className={`-mx-1 overflow-hidden px-1 transition-[max-height,opacity,transform,padding] duration-300 ease-out md:max-h-none md:opacity-100 ${
                        isScrolled
                          ? "max-h-0 -translate-y-2 pb-0 opacity-0 md:translate-y-0"
                          : "max-h-24 translate-y-0 pb-1 opacity-100"
                      }`}
                    >
                      <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {headerTabs.map((item) => {
                          const isActive = item.matches(pathname);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition ${
                                isActive
                                  ? "bg-white/12 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                                  : "text-slate-300 hover:bg-white/8 hover:text-white"
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="hidden flex-wrap items-center gap-3 md:flex xl:flex-nowrap">
                    <div className="hidden min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-slate-300 shadow-[0_10px_22px_rgba(15,23,42,0.14)] md:flex xl:w-[320px]">
                      <SearchIcon />
                      <span className="truncate text-slate-400">
                        Cari menu, data, atau aktivitas admin
                      </span>
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-slate-100 transition hover:bg-white/12"
                    >
                      <BellIcon />
                    </button>

                    <div className="flex min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/8 px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b5cf6_0%,#6366f1_52%,#60a5fa_100%)] text-sm font-semibold text-white shadow-[0_12px_24px_rgba(99,102,241,0.35)]">
                        {(user.name ?? "A").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 pr-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {user.name ?? "Administrator"}
                        </p>
                        <p className="truncate text-xs text-slate-300">
                          Administrator Sekolah
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`max-w-3xl overflow-hidden space-y-2.5 transition-[max-height,opacity,transform] duration-300 ease-out sm:space-y-3 ${
                    isScrolled
                      ? "max-h-0 -translate-y-3 opacity-0 md:max-h-48 md:translate-y-0 md:opacity-100"
                      : "max-h-48 translate-y-0 opacity-100"
                  }`}
                >
                  <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2rem]">
                    {currentTitle}
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:hidden">
                    Kelola data inti sekolah dan pantau perubahan utama dari satu dashboard administrasi.
                  </p>
                  <p className="hidden max-w-2xl text-sm leading-7 text-slate-300 sm:block sm:text-[15px]">
                    Kelola data inti sekolah melalui navigasi di samping dan pantau perubahan dari setiap halaman kerja dalam satu dashboard administrasi yang lebih terstruktur.
                  </p>
                </div>
              </div>
            </header>
          </div>

          <main
            className={`relative z-0 min-w-0 overflow-x-clip pb-6 ${
              isDashboardHome ? "pt-5 lg:-mt-10 lg:pt-0" : "pt-4"
            }`}
          >
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

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M9 5.5h6" />
      <path d="M9.5 3.5h5a1.5 1.5 0 0 1 1.5 1.5v1H8V5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M7 6.5h10A1.5 1.5 0 0 1 18.5 8v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V8A1.5 1.5 0 0 1 7 6.5Z" />
      <path d="M8.5 11h7" />
      <path d="M8.5 15h5" />
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

function SearchIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 3.5 3.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M8.5 17.5h7" />
      <path d="M9 17.5v-5a3 3 0 1 1 6 0v5" />
      <path d="M6.5 17.5h11" />
      <path d="M8 20a4.5 4.5 0 0 0 8 0" />
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
