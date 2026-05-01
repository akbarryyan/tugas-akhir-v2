import { Role } from "@prisma/client";

import { AdminDashboardShell } from "@/components/auth/admin-dashboard-shell";
import { getRecentAdminActivities } from "@/lib/admin/activity";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.ADMIN]);
  const [latestAdminUser, recentActivities] = await Promise.all([
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
    getRecentAdminActivities(5),
  ]);

  return (
    <AdminDashboardShell
      activities={recentActivities}
      user={{
        ...session.user,
        email: latestAdminUser?.email ?? session.user.email,
        image: latestAdminUser?.avatarUrl ?? session.user.image,
        name: latestAdminUser?.name ?? session.user.name,
      }}
      description="Kelola data utama, akun pengguna, dan kebutuhan administrasi sekolah secara tertata dari satu portal."
    >
      {children}
    </AdminDashboardShell>
  );
}
