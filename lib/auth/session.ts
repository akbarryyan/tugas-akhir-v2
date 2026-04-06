import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";
import { getDashboardPathForRole } from "@/lib/auth/redirect";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  return session;
}
