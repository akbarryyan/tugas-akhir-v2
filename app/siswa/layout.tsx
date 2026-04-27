import { Role } from "@prisma/client";

import { StudentDashboardShell } from "@/components/auth/student-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getStudentDashboardWeather } from "@/lib/weather/student-dashboard-weather";

export default async function SiswaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.SISWA]);
  const [weather, latestStudentUser] = await Promise.all([
    getStudentDashboardWeather(),
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        avatarUrl: true,
        email: true,
        name: true,
      },
    }),
  ]);

  return (
    <StudentDashboardShell
      user={{
        ...session.user,
        email: latestStudentUser?.email ?? session.user.email,
        image: latestStudentUser?.avatarUrl ?? session.user.image,
        name: latestStudentUser?.name ?? session.user.name,
      }}
      weather={weather}
      description="Kelola kegiatan tryoutmu dari satu tempat yang ringan, rapi, dan mudah dipahami."
    >
      {children}
    </StudentDashboardShell>
  );
}
