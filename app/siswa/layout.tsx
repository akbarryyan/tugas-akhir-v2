import { Role } from "@prisma/client";

import { StudentDashboardShell } from "@/components/auth/student-dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export default async function SiswaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.SISWA]);

  return (
    <StudentDashboardShell
      user={session.user}
      description="Kelola kegiatan tryoutmu dari satu tempat yang ringan, rapi, dan mudah dipahami."
    >
      {children}
    </StudentDashboardShell>
  );
}
