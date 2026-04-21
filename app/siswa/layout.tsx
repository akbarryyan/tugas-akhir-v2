import { Role } from "@prisma/client";

import { StudentDashboardShell } from "@/components/auth/student-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { getStudentDashboardWeather } from "@/lib/weather/student-dashboard-weather";

export default async function SiswaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.SISWA]);
  const weather = await getStudentDashboardWeather();

  return (
    <StudentDashboardShell
      user={session.user}
      weather={weather}
      description="Kelola kegiatan tryoutmu dari satu tempat yang ringan, rapi, dan mudah dipahami."
    >
      {children}
    </StudentDashboardShell>
  );
}
