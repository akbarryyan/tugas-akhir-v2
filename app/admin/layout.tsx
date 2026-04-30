import { Role } from "@prisma/client";

import { AdminDashboardShell } from "@/components/auth/admin-dashboard-shell";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.ADMIN]);
  const latestAdminUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      avatarUrl: true,
      email: true,
      name: true,
    },
  });

  return (
    <AdminDashboardShell
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
