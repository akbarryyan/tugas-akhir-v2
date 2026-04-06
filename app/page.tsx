import { redirect } from "next/navigation";

import { getDashboardPathForRole } from "@/lib/auth/redirect";
import { getCurrentSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getCurrentSession();

  if (session?.user) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  redirect("/login");
}
