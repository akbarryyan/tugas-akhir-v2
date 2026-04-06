import { Role } from "@prisma/client";

import { DashboardShell } from "@/components/auth/dashboard-shell";
import { requireRole } from "@/lib/auth/session";

export default async function SiswaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole([Role.SISWA]);

  return (
    <DashboardShell
      role={Role.SISWA}
      user={session.user}
      description="Kerjakan tryout, lihat hasilnya, lalu isi tanggapan setelah kegiatan selesai."
    >
      {children}
    </DashboardShell>
  );
}
