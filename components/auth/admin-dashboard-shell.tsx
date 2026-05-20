"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMethod } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminActivityItem } from "@/lib/admin/activity";

type AdminDashboardShellProps = {
  activities?: AdminActivityItem[];
  children: ReactNode;
  description: string;
  user: {
    authMethod: AuthMethod;
    email?: string | null;
    image?: string | null;
    name?: string | null;
  };
};

const navigationItems = [
  { href: "/admin", label: "Beranda", icon: HomeIcon },
  { href: "/admin/guru", label: "Guru", icon: TeacherIcon },
  { href: "/admin/siswa", label: "Siswa", icon: StudentIcon },
  { href: "/admin/mapel", label: "Akademik", icon: SubjectIcon },
  { href: "/admin/tryout", label: "Tryout", icon: ClipboardIcon },
  { href: "/admin/pengampu", label: "Pengampu", icon: AssignmentIcon },
  { href: "/admin/feedback", label: "Review Sentimen", icon: MessageIcon },
];

const pageTitleByPath: Record<string, string> = {
  "/admin": "Beranda",
  "/admin/guru": "Kelola Data Guru",
  "/admin/mapel": "Kelola Mata Pelajaran",
  "/admin/pengampu": "Kelola Guru Pengampu",
  "/admin/siswa": "Kelola Data Siswa",
  "/admin/tryout": "Monitoring Tryout",
  "/admin/profile": "Profil Admin",
  "/admin/aktivitas": "Riwayat Aktivitas",
  "/admin/feedback": "Review Sentimen",
};

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminDashboardShell({
  activities = [],
  children,
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
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const currentTitle = pageTitleByPath[pathname] ?? "Panel Administrasi";
  const isDashboardHome = pathname === "/admin";
  const isCompactSidebar = isDesktopViewport && isSidebarCollapsed;
  const sidebarWidth = isCompactSidebar ? "96px" : "220px";
  const displayName = user.name ?? "Administrator Sekolah";
  const displayEmail = user.email ?? "Administrator Sekolah";

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const syncViewport = () => {
      const isDesktop = window.innerWidth >= 1024;

      setIsDesktopViewport(isDesktop);

      if (isDesktop) {
        setIsSidebarOpen(false);
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      isSidebarOpen && !isDesktopViewport ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen, isDesktopViewport]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isNotificationOpen && !isUserMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        isNotificationOpen &&
        !notificationRef.current?.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }

      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationOpen, isUserMenuOpen]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup navigasi"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-50 animate-[adminOverlayFade_280ms_cubic-bezier(0.22,1,0.36,1)] bg-slate-950/28 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <div
        className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 overflow-x-clip px-3 py-3 transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 sm:py-4 lg:grid lg:gap-0 lg:px-0 lg:py-0 lg:[grid-template-columns:var(--sidebar-width)_minmax(0,1fr)]"
        style={{ "--sidebar-width": sidebarWidth } as CSSProperties}
      >
        <aside
          className={`fixed inset-y-0 left-0 z-[60] w-[min(82vw,300px)] transform-gpu overflow-hidden border-r border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] will-change-transform transition-[transform,box-shadow] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:inset-y-auto lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:translate-x-0 lg:shadow-none ${
            isSidebarOpen
              ? "translate-x-0"
              : "pointer-events-none -translate-x-full lg:pointer-events-auto"
          }`}
        >
          <div
            className={`flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] transition-[transform,opacity] duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0 lg:opacity-100 ${
              isSidebarOpen
                ? "translate-x-0 opacity-100 delay-75"
                : "-translate-x-5 opacity-90 delay-0"
            }`}
          >
            <div
              className={`pb-3 pt-4 transition-[padding] duration-200 ease-out ${
                isCompactSidebar ? "lg:px-4" : "px-5 sm:px-6"
              }`}
            >
              <div className="mb-4 flex justify-center lg:hidden">
                <div className="h-1.5 w-14 rounded-full bg-slate-200" />
              </div>

              <div className="relative flex items-center justify-center">
                <div className="inline-flex h-10 w-10 items-center justify-center text-indigo-700">
                  <SchoolIcon />
                </div>

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute right-0 inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 lg:hidden"
                >
                  <CloseIcon />
                </button>
              </div>

            </div>

            <div
              className={`flex min-h-0 flex-1 flex-col py-4 ${
                isCompactSidebar ? "lg:px-3" : "px-4"
              }`}
            >
              <div className={`px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300 ${isCompactSidebar ? "lg:text-center" : ""}`}>
                {isCompactSidebar ? "Menu" : "Menu Utama"}
              </div>

              <nav className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto pr-1 pb-4">
                <div className="grid gap-1.5">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href));

                    return (
                      <div key={item.href} className="group relative">
                        <Link
                          href={item.href}
                          onClick={() => setIsSidebarOpen(false)}
                          title={item.label}
                          className={`flex min-w-0 items-center rounded-[0.95rem] transition-all duration-200 ${
                            isCompactSidebar ? "justify-center px-0 py-3" : "gap-2.5 px-3 py-2.5"
                          } ${
                            isActive
                              ? "bg-[#eef2ff] text-indigo-700"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] ${
                              isActive
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-slate-400"
                            }`}
                          >
                            <Icon />
                          </span>
                          <span
                            className={`min-w-0 transition-[max-width,opacity] duration-200 ${
                              isCompactSidebar
                                ? "lg:max-w-0 lg:overflow-hidden lg:opacity-0"
                                : "max-w-[180px] opacity-100"
                            }`}
                          >
                            <span className="block text-sm font-medium">{item.label}</span>
                          </span>
                        </Link>

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

            <div className="shrink-0 border-t border-slate-200/80 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              <p
                className={`mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300 ${
                  isCompactSidebar ? "lg:text-center lg:opacity-0" : ""
                }`}
              >
                Lainnya
              </p>
              <SignOutButton
                className={`w-full rounded-[0.95rem] border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCompactSidebar ? "lg:px-0" : "px-4"
                }`}
                pendingLabel="Keluar..."
              />
            </div>
          </div>
        </aside>

        <div className="min-w-0 lg:px-5 lg:py-5">
          <div className="pb-4 sm:pb-5 lg:pb-5">
            <header
              className={`rounded-[1.05rem] border border-slate-200/80 bg-white px-4 transition-[padding,box-shadow] duration-300 sm:px-5 ${
                isScrolled ? "py-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]" : "py-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDesktopViewport) {
                        setIsSidebarOpen(false);
                        setIsSidebarCollapsed((current) => !current);
                        return;
                      }

                      setIsSidebarOpen(true);
                    }}
                    title={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <span className="transition-transform duration-300">
                      {isSidebarCollapsed ? <ExpandIcon /> : <CollapseIcon />}
                    </span>
                  </button>
                  <h2 className="hidden min-w-0 truncate text-[1.12rem] font-semibold leading-tight tracking-tight text-slate-950 sm:block sm:text-[1.18rem]">
                    {user.name ?? currentTitle}
                  </h2>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div ref={notificationRef} className="relative">
                    <button
                      type="button"
                      aria-expanded={isNotificationOpen}
                      aria-haspopup="dialog"
                      onClick={() => {
                        setIsNotificationOpen((current) => !current);
                        setIsUserMenuOpen(false);
                      }}
                      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white transition ${
                        isNotificationOpen
                          ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                          : "border-slate-200 text-indigo-400 hover:border-slate-300 hover:text-indigo-600"
                      }`}
                    >
                      <BellIcon />
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
                    </button>

                    <div
                      role="dialog"
                      aria-label="Notifikasi admin"
                      className={`absolute right-0 top-[calc(100%+0.7rem)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-[1.05rem] border border-slate-200 bg-white p-2 shadow-[0_22px_50px_rgba(15,23,42,0.14)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isNotificationOpen
                          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                      }`}
                    >
                      <div className="rounded-[0.9rem] bg-slate-50 px-3 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          Notifikasi
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Ringkasan aktivitas admin dan pembaruan sistem.
                        </p>
                      </div>

                      <div className="mt-2 grid gap-1">
                        {activities.length > 0 ? (
                          activities.slice(0, 4).map((activity) => (
                            <NotificationItem
                              key={activity.id}
                              title={activity.message}
                              description={`${formatActivityEntity(activity.entityType)} oleh ${activity.actorName} • ${formatRelativeActivityTime(activity.createdAt)}`}
                            />
                          ))
                        ) : (
                          <div className="rounded-[0.85rem] px-3 py-3 text-sm leading-6 text-slate-500">
                            Belum ada aktivitas admin terbaru.
                          </div>
                        )}
                        <Link
                          href="/admin/aktivitas"
                          onClick={() => setIsNotificationOpen(false)}
                          className="mt-1 inline-flex items-center justify-center rounded-[0.85rem] bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Lihat Riwayat Aktivitas
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div ref={userMenuRef} className="relative">
                    <button
                      type="button"
                      aria-expanded={isUserMenuOpen}
                      aria-haspopup="menu"
                      onClick={() => {
                        setIsUserMenuOpen((current) => !current);
                        setIsNotificationOpen(false);
                      }}
                      className={`flex items-center gap-1 rounded-full border border-transparent py-0.5 pl-0.5 pr-1 transition ${
                        isUserMenuOpen
                          ? "border-slate-200 bg-slate-50"
                          : "hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <AdminHeaderAvatar
                        image={user.image}
                        initial={displayName.slice(0, 1).toUpperCase()}
                        sizeClassName="h-8 w-8 text-[11px]"
                      />
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition ${
                          isUserMenuOpen ? "rotate-180 text-slate-600" : ""
                        }`}
                      >
                        <ChevronDownIcon />
                      </span>
                    </button>

                    <div
                      role="menu"
                      className={`absolute right-0 top-[calc(100%+0.65rem)] z-50 w-64 origin-top-right rounded-[1.05rem] border border-slate-200 bg-white p-2 shadow-[0_22px_50px_rgba(15,23,42,0.14)] transition-all duration-200 ease-out ${
                        isUserMenuOpen
                          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                          : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                      }`}
                    >
                      <div className="rounded-[0.9rem] bg-slate-50 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <AdminHeaderAvatar
                            image={user.image}
                            initial={displayName.slice(0, 1).toUpperCase()}
                            sizeClassName="h-10 w-10 text-sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {displayName}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {displayEmail}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid gap-1">
                        <Link
                          href="/admin/profile"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-[0.85rem] px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          <UserIcon />
                          Profil Admin
                        </Link>
                        <SignOutButton
                          className="flex w-full items-center gap-2 rounded-[0.85rem] px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          confirmTitle="Keluar dari Panel Admin"
                          pendingLabel={
                            <span className="inline-flex items-center gap-2">
                              <SmallSpinnerIcon />
                              Keluar...
                            </span>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <main className={`relative min-w-0 overflow-x-clip pb-6 ${isDashboardHome ? "pt-1" : "pt-2"}`}>
            {children}
          </main>
        </div>
      </div>

      <style jsx>{`
        @keyframes adminOverlayFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
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

function AdminHeaderAvatar({
  image,
  initial,
  sizeClassName,
}: {
  image?: string | null;
  initial: string;
  sizeClassName: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt="Foto profil admin"
        width={40}
        height={40}
        className={`${sizeClassName} shrink-0 rounded-full object-cover ring-2 ring-indigo-100`}
      />
    );
  }

  return (
    <span
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#818cf8_0%,#6366f1_55%,#60a5fa_100%)] font-semibold text-white`}
    >
      {initial}
    </span>
  );
}

function NotificationItem({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-[0.85rem] px-3 py-2.5 transition hover:bg-slate-50">
      <div className="flex gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function formatActivityEntity(entityType: AdminActivityItem["entityType"]) {
  const labels: Record<AdminActivityItem["entityType"], string> = {
    GURU: "Guru",
    MAPEL: "Mapel",
    PENGAMPU: "Pengampu",
    PROFIL: "Profil",
    SISWA: "Siswa",
  };

  return labels[entityType];
}

function formatRelativeActivityTime(date: Date) {
  const activityTime = new Date(date).getTime();
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - activityTime) / 1000));

  if (diffInSeconds < 60) {
    return "baru saja";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit lalu`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} jam lalu`;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
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

function UserIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()} className="h-4 w-4">
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

function MessageIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M5.5 7.5A2.5 2.5 0 0 1 8 5h8a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 16 15H11l-3.5 3v-3H8A2.5 2.5 0 0 1 5.5 12.5v-5Z" />
      <path d="M9 9.5h6" />
      <path d="M9 12h4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="M15.5 17.5h-7" />
      <path d="M18 17.5H6l1.4-2.1V11a4.6 4.6 0 0 1 9.2 0v4.4L18 17.5Z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
      <path d="M12 5.2V3.8" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" {...iconProps()}>
      <path d="m7 10 5 5 5-5" />
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
      <path d="M4 9.5 12 5l8 4.5-8 4.5-8-4.5Z" />
      <path d="M7.5 11.5v4c0 1.8 2 3 4.5 3s4.5-1.2 4.5-3v-4" />
    </svg>
  );
}

function SmallSpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        className="stroke-current/25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="stroke-current"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
