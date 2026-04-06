import { Role } from "@prisma/client";

import { DashboardShell } from "@/components/auth/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.ADMIN]);

  return (
    <DashboardShell
      role={Role.ADMIN}
      user={session.user}
      description="Kelola data utama, akun pengguna, dan kebutuhan administrasi sekolah secara tertata dari satu portal."
    >
      {children}
    </DashboardShell>
  );
}
