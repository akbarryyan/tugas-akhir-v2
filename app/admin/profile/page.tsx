import Image from "next/image";
import Link from "next/link";
import { AuthMethod, Role } from "@prisma/client";

import { StatusAlert } from "@/app/admin/_components";
import { LoadingSubmitButton } from "@/app/admin/_client-actions";
import { updateAdminProfileAction } from "@/app/admin/profile/_actions";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type AdminProfilePageProps = {
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function AdminProfilePage({
  searchParams,
}: AdminProfilePageProps) {
  const session = await requireRole([Role.ADMIN]);
  const resolvedSearchParams = await searchParams;
  const admin = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      authMethod: true,
      avatarUrl: true,
      createdAt: true,
      email: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  });

  const profile = admin ?? {
    authMethod: session.user.authMethod,
    avatarUrl: session.user.image ?? null,
    createdAt: null,
    email: session.user.email ?? null,
    name: session.user.name ?? "Administrator Sekolah",
    role: session.user.role,
    updatedAt: null,
  };
  const initial = profile.name.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-5">
      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 bg-white px-6 py-7">
            <div className="flex items-center gap-4">
              <AdminProfileAvatar
                image={profile.avatarUrl}
                initial={initial}
                sizeClassName="h-20 w-20 text-2xl"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  Profil Admin
                </p>
                <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950">
                  {profile.name}
                </h1>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {profile.email ?? "Email belum tersedia"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5">
            <ProfileMetaRow label="Role" value={formatRole(profile.role)} />
            <ProfileMetaRow
              label="Metode Login"
              value={formatAuthMethod(profile.authMethod)}
            />
            <ProfileMetaRow
              label="Terdaftar"
              value={profile.createdAt ? formatDate(profile.createdAt) : "-"}
            />
            <ProfileMetaRow
              label="Terakhir Diperbarui"
              value={profile.updatedAt ? formatDate(profile.updatedAt) : "-"}
            />
          </div>
        </div>

        <div className="grid gap-5">
          <form
            action={updateAdminProfileAction}
            className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Perbarui Profil
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ubah nama, email, dan foto profil yang tampil di panel admin.
                </p>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                Aktif
              </span>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="space-y-3 text-sm font-medium text-slate-700">
                <span>Foto Profil</span>
                <div className="flex flex-col gap-4 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
                  <AdminProfileAvatar
                    image={profile.avatarUrl}
                    initial={initial}
                    sizeClassName="h-20 w-20 text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      name="avatar"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Gunakan gambar PNG, JPG, atau WEBP dengan ukuran maksimal 2 MB.
                    </p>
                  </div>
                </div>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Nama Lengkap</span>
                  <input
                    type="text"
                    name="name"
                    defaultValue={profile.name}
                    required
                    className="h-11 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    defaultValue={profile.email ?? ""}
                    required
                    className="h-11 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <InfoCard label="Hak Akses" value={formatRole(profile.role)} />
                <InfoCard
                  label="Autentikasi"
                  value={formatAuthMethod(profile.authMethod)}
                />
              </div>

              <LoadingSubmitButton
                idleLabel="Simpan Perubahan"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan perubahan profil admin..."
                className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(79,70,229,0.22)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </form>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-900">
              Catatan Keamanan
            </p>
            <div className="mt-4 grid gap-3">
              <SecurityNote>
                Gunakan email dan password admin hanya pada perangkat yang
                dipercaya.
              </SecurityNote>
              <SecurityNote>
                Jika ada aktivitas yang tidak dikenal, segera keluar dari akun
                dan ganti kredensial melalui database/admin utama.
              </SecurityNote>
              <SecurityNote>
                Perubahan email akan dipakai untuk login berikutnya, jadi
                pastikan alamat email yang dimasukkan benar dan aktif.
              </SecurityNote>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href="/admin"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition hover:border-indigo-200 hover:text-indigo-600"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

function ProfileMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <span className="text-right text-sm font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function AdminProfileAvatar({
  image,
  initial,
  sizeClassName,
}: {
  image: string | null;
  initial: string;
  sizeClassName: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt="Foto profil admin"
        width={96}
        height={96}
        className={`${sizeClassName} shrink-0 rounded-[1.35rem] object-cover shadow-[0_14px_30px_rgba(79,70,229,0.14)]`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[1.35rem] bg-indigo-600 font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.18)] ${sizeClassName}`}
    >
      {initial}
    </div>
  );
}

function SecurityNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-[1rem] bg-indigo-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
      <p>{children}</p>
    </div>
  );
}

function formatRole(role: Role) {
  return role === Role.ADMIN ? "Administrator Sekolah" : role;
}

function formatAuthMethod(authMethod: AuthMethod) {
  return authMethod === AuthMethod.EMAIL_PASSWORD
    ? "Email & Password"
    : "NISN";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
