import { Role } from "@prisma/client";

import { TeacherDashboardShell } from "@/components/auth/teacher-dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export default async function GuruLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.GURU]);

  return (
    <TeacherDashboardShell
      user={session.user}
      description="Kelola perangkat evaluasi, pantau capaian belajar siswa, dan tinjau umpan balik siswa terhadap pembelajaran pada mata pelajaran yang Anda ampu."
    >
      {children}
    </TeacherDashboardShell>
  );
}
