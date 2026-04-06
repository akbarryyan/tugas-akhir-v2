import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getDashboardPathForRole } from "@/lib/auth/redirect";
import { getCurrentSession } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentSession();

  if (session?.user) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  const resolvedSearchParams = await searchParams;
  const callbackUrl = resolvedSearchParams?.callbackUrl ?? "/";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)]">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="space-y-6">
          <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold tracking-[0.18em] text-indigo-700 uppercase">
            Portal Akademik
          </div>

          <div className="space-y-5">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Akses layanan belajar dan evaluasi siswa dalam satu portal.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Silakan masuk sesuai peran Anda. Admin dan guru menggunakan email
              serta password, sedangkan siswa masuk dengan NISN yang telah
              terdaftar.
            </p>
          </div>
        </section>

        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
