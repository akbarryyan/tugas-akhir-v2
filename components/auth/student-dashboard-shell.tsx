"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
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
    image?: string | null;
    name?: string | null;
  };
  weather: {
    locationLabel: string;
    periodLabel: string;
    temperatureLabel: string;
  };
};

const STORAGE_KEY = "student-sidebar-collapsed";

export function StudentDashboardShell({
  children,
  description,
  user,
  weather,
}: StudentDashboardShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [isLearningMenuOpen, setIsLearningMenuOpen] = useState(() => {
    return (
      pathname.startsWith("/siswa/tryout") ||
      pathname.startsWith("/siswa/hasil") ||
      pathname.startsWith("/siswa/tanggapan")
    );
  });
  const studentName = user.name ?? "Siswa";
  const studentFirstName = studentName.split(" ")[0] ?? studentName;
  const studentInitial = studentName.slice(0, 1).toUpperCase();
  const studentAvatarUrl = user.image ?? null;
  const isSidebarCollapsedEffective = isDesktopViewport && isSidebarCollapsed;
  const sidebarWidth = isSidebarCollapsedEffective ? "92px" : "240px";
  const isLearningRoute =
    pathname.startsWith("/siswa/tryout") ||
    pathname.startsWith("/siswa/hasil") ||
    pathname.startsWith("/siswa/tanggapan");
  const shouldShowLearningMenu = !isSidebarCollapsedEffective && isLearningMenuOpen;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const syncViewport = () => {
      setIsDesktopViewport(window.innerWidth >= 1024);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#f6f8fc_100%)] text-slate-900">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu siswa"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/24 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden"
        />
      ) : null}

      <div
        className="mx-auto flex min-h-screen w-full max-w-[1520px] gap-4 overflow-x-clip px-3 py-3 sm:px-4 sm:py-4 lg:grid lg:items-start lg:gap-0 lg:rounded-[2.1rem] lg:border lg:border-slate-200/80 lg:bg-white lg:px-0 lg:py-0 lg:shadow-[0_26px_62px_rgba(15,23,42,0.08)] lg:[grid-template-columns:var(--student-sidebar-width)_minmax(0,1fr)]"
        style={{ "--student-sidebar-width": sidebarWidth } as CSSProperties}
      >
        <aside
          className={`fixed inset-0 z-50 w-screen overflow-hidden bg-white transition-[transform,opacity,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:self-start lg:w-auto lg:bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] lg:translate-x-0 lg:border-0 lg:border-r lg:border-slate-200/80 lg:shadow-none ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div
            className={`flex h-full min-h-0 flex-col border-r-0 border-slate-200/80 px-4 py-4 transition-[opacity,transform] duration-300 ease-out lg:border-r lg:px-0 lg:py-0 ${
              isSidebarOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2 lg:translate-y-0 lg:opacity-100"
            }`}
          >
            <div
              className={`border-b border-slate-200/80 pb-4 pt-1 transition-[padding] duration-300 lg:pb-5 ${
                isSidebarCollapsedEffective ? "lg:px-3" : "px-5"
              }`}
            >
              <div className="flex items-center justify-between lg:hidden">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                    Menu Siswa
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Pilih halaman belajar yang ingin kamu buka.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <CloseIcon />
                </button>
              </div>

              <div
                className={`mt-4 rounded-[1.65rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_14px_32px_rgba(15,23,42,0.05)] transition-[opacity,transform] duration-300 ease-out lg:hidden ${
                  isSidebarOpen ? "opacity-100 translate-y-0 delay-75" : "opacity-0 translate-y-2"
                }`}
              >
                <div className="flex items-center gap-3">
                  <StudentAvatar
                    image={studentAvatarUrl}
                    initial={studentInitial}
                    sizeClassName="h-12 w-12 text-sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {studentName}
                    </p>
                    <p className="mt-1 truncate text-xs leading-5 text-slate-400">
                      {user.email ??
                        (user.authMethod === AuthMethod.NISN
                          ? "Akun siswa aktif"
                          : "Akun portal")}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`hidden lg:flex ${isSidebarCollapsedEffective ? "justify-center" : "justify-end"}`}>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed((current) => !current)}
                  title={isSidebarCollapsedEffective ? "Buka sidebar" : "Ringkas sidebar"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
                >
                  {isSidebarCollapsedEffective ? <ExpandIcon /> : <CollapseIcon />}
                </button>
              </div>

              <div className={`mt-1 hidden text-center lg:block ${isSidebarCollapsedEffective ? "lg:mt-4" : ""}`}>
                <StudentAvatar
                  image={studentAvatarUrl}
                  initial={studentInitial}
                  sizeClassName="mx-auto h-14 w-14 text-base"
                />
                <p
                  className={`mt-3 text-sm font-semibold text-slate-900 transition-[max-height,opacity,transform] duration-300 ${
                    isSidebarCollapsedEffective
                      ? "lg:max-h-0 lg:-translate-y-1 lg:overflow-hidden lg:opacity-0"
                      : "max-h-10 translate-y-0 opacity-100"
                  }`}
                >
                  Hello, {studentFirstName}
                </p>
                <p
                  className={`mt-1 text-[11px] leading-5 text-slate-400 transition-[max-height,opacity,transform] duration-300 ${
                    isSidebarCollapsedEffective
                      ? "lg:max-h-0 lg:-translate-y-1 lg:overflow-hidden lg:opacity-0"
                      : "max-h-10 translate-y-0 opacity-100"
                  }`}
                >
                  {user.email ?? (user.authMethod === AuthMethod.NISN ? "Akun siswa aktif" : "Akun portal")}
                </p>
              </div>
            </div>

            <div
              className={`flex min-h-0 flex-1 flex-col py-4 transition-[padding] duration-300 ${
                isSidebarCollapsedEffective ? "lg:px-3" : "px-4"
              }`}
            >
              <div
                className={`mb-3 px-1 transition-[opacity,transform] duration-300 ease-out lg:hidden ${
                  isSidebarOpen ? "opacity-100 translate-y-0 delay-100" : "opacity-0 translate-y-2"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Navigasi Belajar
                </p>
              </div>
              <nav
                className={`no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1 transition-[opacity,transform] duration-300 ease-out lg:translate-y-0 lg:opacity-100 ${
                  isSidebarOpen ? "opacity-100 translate-y-0 delay-150" : "opacity-0 translate-y-3"
                }`}
              >
                <div className="space-y-1">
                  <SidebarPrimaryLink
                    href="/siswa"
                    icon={<DashboardIcon />}
                    isActive={pathname === "/siswa"}
                    isCollapsed={isSidebarCollapsedEffective}
                    label="Dashboard"
                    onNavigate={() => setIsSidebarOpen(false)}
                  />

                  <div className={`rounded-[1.4rem] ${isSidebarCollapsedEffective ? "px-0 py-1" : "px-2 py-1.5"}`}>
                    <button
                      type="button"
                      onClick={() => setIsLearningMenuOpen((current) => !current)}
                      className={`flex w-full items-center justify-between gap-3 rounded-full px-2 py-2 text-left text-[13px] font-medium transition ${
                        isLearningRoute
                          ? "bg-[#e8f0ff] text-blue-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsedEffective ? "justify-center w-full" : "gap-2"}`}>
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl ${
                            isLearningRoute ? "text-blue-700" : "text-slate-500"
                          }`}
                        >
                          <TryoutIcon />
                        </span>
                        <span
                          className={`transition-[max-width,opacity] duration-300 ${
                            isSidebarCollapsedEffective ? "lg:max-w-0 lg:overflow-hidden lg:opacity-0" : "max-w-[180px] opacity-100"
                          }`}
                        >
                          Aktivitas Belajar
                        </span>
                      </div>
                      <span
                        className={`transition-[opacity,transform] duration-300 ${
                          isSidebarCollapsedEffective ? "lg:hidden" : "opacity-100"
                        }`}
                      >
                        <span className={`block transition-transform duration-300 ${shouldShowLearningMenu ? "rotate-180" : ""}`}>
                          <ChevronDownIcon />
                        </span>
                      </span>
                    </button>

                    {shouldShowLearningMenu ? (
                      <div className="space-y-1.5 pl-11 pt-1 sm:pl-[2.85rem]">
                        <SidebarChildLink
                          href="/siswa/tryout"
                          label="Tryout"
                          isActive={pathname.startsWith("/siswa/tryout")}
                          onNavigate={() => setIsSidebarOpen(false)}
                        />
                        <SidebarChildLink
                          href="/siswa/hasil"
                          label="Hasil"
                          isActive={pathname.startsWith("/siswa/hasil")}
                          onNavigate={() => setIsSidebarOpen(false)}
                        />
                        <SidebarChildLink
                          href="/siswa/tanggapan"
                          label="Tanggapan"
                          isActive={pathname.startsWith("/siswa/tanggapan")}
                          onNavigate={() => setIsSidebarOpen(false)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <SidebarRowLink
                    href="/siswa/progres"
                    icon={<ResultIcon />}
                    isActive={pathname.startsWith("/siswa/progres")}
                    isCollapsed={isSidebarCollapsedEffective}
                    label="Progres"
                    onNavigate={() => setIsSidebarOpen(false)}
                  />
                  <SidebarRowLink
                    href="/siswa/pengaturan"
                    icon={<SettingsIcon />}
                    isActive={pathname.startsWith("/siswa/pengaturan")}
                    isCollapsed={isSidebarCollapsedEffective}
                    label="Pengaturan"
                    onNavigate={() => setIsSidebarOpen(false)}
                  />
                </div>
              </nav>
            </div>

            <div
              className={`border-t border-slate-200/80 py-4 transition-[padding] duration-300 ${
                isSidebarCollapsedEffective ? "lg:px-3" : "px-4"
              }`}
            >
              <p
                className={`mb-3 hidden text-[10px] leading-5 text-slate-400 transition-[max-height,opacity] duration-300 lg:block ${
                  isSidebarCollapsedEffective ? "lg:max-h-0 lg:overflow-hidden lg:opacity-0" : "max-h-16 opacity-100"
                }`}
              >
                {description}
              </p>
              <SignOutButton
                className={`w-full rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSidebarCollapsedEffective ? "lg:px-0" : "px-4"
                }`}
                confirmTitle="Keluar dari Dashboard Siswa"
                pendingLabel="Keluar..."
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 lg:bg-[#fbfcff]">
          <div className="sticky top-3 z-30 pb-4 sm:top-4 sm:pb-5 lg:top-0 lg:pb-0">
            <header className="relative overflow-hidden rounded-[1.6rem] border border-white/80 bg-white px-3.5 py-3.5 shadow-[0_20px_48px_rgba(15,23,42,0.08)] sm:px-5 sm:py-5 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b lg:border-slate-200/80 lg:px-6 lg:py-4 lg:shadow-none">
              <div className="pointer-events-none absolute right-0 top-0 h-full w-[42%] bg-[radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.14),transparent_22%),radial-gradient(circle_at_88%_78%,rgba(56,189,248,0.12),transparent_24%)]" />

              <div className="relative flex flex-col gap-3 lg:gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition hover:border-blue-200 hover:text-blue-700 lg:hidden"
                    >
                      <MenuIcon />
                    </button>
                    <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700 sm:text-[11px]">
                      Student Dashboard
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:justify-end">
                  <div className="flex min-w-0 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 shadow-inner shadow-white md:min-w-[250px] xl:min-w-[280px]">
                    <SearchIcon />
                    <span className="truncate">Cari tryout, hasil, atau aktivitas belajar</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 sm:inline-flex">
                      <WeatherIcon />
                      {weather.temperatureLabel}
                    </div>
                    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 md:inline-flex">
                      <LocationIcon />
                      {weather.locationLabel}
                    </div>
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_100%)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] sm:w-auto">
                      <CalendarIcon />
                      {weather.periodLabel}
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <main className="min-w-0 overflow-x-clip pb-6 lg:px-6 lg:pt-5">{children}</main>
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

function DashboardIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M4.5 5.5h6v6h-6z" />
      <path d="M13.5 5.5h6v4h-6z" />
      <path d="M13.5 12.5h6v6h-6z" />
      <path d="M4.5 14.5h6v4h-6z" />
    </svg>
  );
}

function TryoutIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M8 4.5h8" />
      <path d="M8.5 2.5h7A1.5 1.5 0 0 1 17 4v1H7V4a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M6.5 5.5h11A1.5 1.5 0 0 1 19 7v12A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5V7A1.5 1.5 0 0 1 6.5 5.5Z" />
      <path d="M8.5 10.5h7" />
      <path d="M8.5 14.5h5" />
    </svg>
  );
}

function ResultIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M6 17.5V12" />
      <path d="M12 17.5V7.5" />
      <path d="M18 17.5v-4" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.2 1.2a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.2a1.2 1.2 0 0 1-1.2 1.2h-1.6a1.2 1.2 0 0 1-1.2-1.2v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1.2-1.2a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.2A1.2 1.2 0 0 1 2.9 13v-1.6a1.2 1.2 0 0 1 1.2-1.2h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.2-1.2a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9v-.2A1.2 1.2 0 0 1 10.2 3h1.6A1.2 1.2 0 0 1 13 4.2v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.2 1.2a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.2 1.2 0 0 1 1.2 1.2V13a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.8Z" />
    </svg>
  );
}

function SidebarPrimaryLink({
  href,
  icon,
  isActive,
  isCollapsed,
  label,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      className={`flex items-center rounded-full py-3 text-sm font-semibold transition ${
        isCollapsed ? "justify-center px-0" : "gap-2 px-4"
      } ${
        isActive
          ? "bg-[#e8f0ff] text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
          isActive ? "text-blue-700" : "text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span
        className={`transition-[max-width,opacity] duration-300 ${
          isCollapsed ? "lg:max-w-0 lg:overflow-hidden lg:opacity-0" : "max-w-[180px] opacity-100"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function SidebarRowLink({
  href,
  icon,
  isActive,
  isCollapsed,
  label,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={label}
      className={`flex items-center rounded-[1.35rem] py-3 text-sm font-medium transition ${
        isCollapsed ? "justify-center px-0" : "gap-2 px-4"
      } ${
        isActive
          ? "bg-[#e8f0ff] text-blue-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"}`}>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${
            isActive ? "text-blue-700" : "text-slate-500"
          }`}
        >
          {icon}
        </span>
        <span
          className={`transition-[max-width,opacity] duration-300 ${
            isCollapsed ? "lg:max-w-0 lg:overflow-hidden lg:opacity-0" : "max-w-[180px] opacity-100"
          }`}
        >
          {label}
        </span>
      </span>
    </Link>
  );
}

function SidebarChildLink({
  href,
  isActive,
  label,
  onNavigate,
}: {
  href: string;
  isActive: boolean;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block rounded-full px-3 py-1.5 text-sm transition ${
        isActive
          ? "bg-blue-50 font-medium text-blue-700"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}

function StudentAvatar({
  image,
  initial,
  sizeClassName,
}: {
  image: string | null;
  initial: string;
  sizeClassName: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt="Foto profil siswa"
        width={56}
        height={56}
        className={`${sizeClassName} rounded-full object-cover shadow-[0_12px_24px_rgba(37,99,235,0.18)]`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] font-semibold text-white shadow-[0_14px_26px_rgba(37,99,235,0.18)] ${sizeClassName}`}
    >
      {initial}
    </div>
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

function WeatherIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M8 16.5h7.5a3 3 0 0 0 .4-6 4.5 4.5 0 0 0-8.8-.8 3 3 0 0 0 .9 5.8Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M12 20s5-5 5-9a5 5 0 1 0-10 0c0 4 5 9 5 9Z" />
      <path d="M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M7 4.5v3" />
      <path d="M17 4.5v3" />
      <path d="M5.5 8.5h13" />
      <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="m8 10 4 4 4-4" />
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
