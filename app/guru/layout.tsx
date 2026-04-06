import { Role } from "@prisma/client";

import { DashboardShell } from "@/components/auth/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export default async function GuruLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.GURU]);

  return (
    <DashboardShell
      role={Role.GURU}
      user={session.user}
      description="Kelola perangkat evaluasi, pantau capaian belajar siswa, dan tinjau tanggapan siswa pada mata pelajaran yang Anda ampu."
    >
      {children}
    </DashboardShell>
  );
}
