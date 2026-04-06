import { type ReactNode } from "react";
import Link from "next/link";
import { AuthMethod, Role } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";

type DashboardShellProps = {
  children: ReactNode;
  description: string;
  role: Role;
  user: {
    authMethod: AuthMethod;
    email?: string | null;
    name?: string | null;
  };
};

const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  GURU: "Guru",
  SISWA: "Siswa",
};

const authMethodLabel: Record<AuthMethod, string> = {
  EMAIL_PASSWORD: "Email & Password",
  NISN: "NISN",
};

const navigationByRole: Record<
  Role,
  Array<{
    href: string;
    label: string;
  }>
> = {
  ADMIN: [
    { href: "/admin", label: "Beranda" },
    { href: "/admin/guru", label: "Guru" },
    { href: "/admin/siswa", label: "Siswa" },
    { href: "/admin/mapel", label: "Mata Pelajaran" },
    { href: "/admin/pengampu", label: "Guru Pengampu" },
  ],
  GURU: [{ href: "/guru", label: "Beranda" }],
  SISWA: [{ href: "/siswa", label: "Beranda" }],
};

export function DashboardShell({
  children,
  description,
  role,
  user,
}: DashboardShellProps) {
  const navigationItems = navigationByRole[role];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/80 px-6 py-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
              Area {roleLabel[role]}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {user.name ?? "Pengguna"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>

          <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Peran:</span>{" "}
                {roleLabel[role]}
              </p>
              <p>
                <span className="font-medium text-slate-900">Metode Masuk:</span>{" "}
                {authMethodLabel[user.authMethod]}
              </p>
              {user.email ? (
                <p>
                  <span className="font-medium text-slate-900">Email:</span>{" "}
                  {user.email}
                </p>
              ) : null}
            </div>
            <SignOutButton />
          </div>
        </header>

        <nav className="mt-5 flex flex-wrap gap-3">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}
