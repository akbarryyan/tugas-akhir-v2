import Image from "next/image";
import { Role } from "@prisma/client";

import { StatusAlert } from "@/app/admin/_components";
import { LoadingSubmitButton } from "@/app/admin/_client-actions";
import { updateStudentProfileAction } from "@/app/siswa/pengaturan/_actions";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type SiswaPengaturanPageProps = {
  searchParams?: Promise<{
    message?: string;
    type?: string;
  }>;
};

export default async function SiswaPengaturanPage({
  searchParams,
}: SiswaPengaturanPageProps) {
  const session = await requireRole([Role.SISWA]);
  const resolvedSearchParams = await searchParams;

  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      className: true,
      createdAt: true,
      nisn: true,
      user: {
        select: {
          avatarUrl: true,
          name: true,
        },
      },
    },
  });

  if (!studentProfile) {
    return (
      <div className="space-y-5">
        <section className="rounded-[1.8rem] border border-white/80 bg-white p-6 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Pengaturan
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Profil siswa belum tersedia
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Data profil siswa belum ditemukan, jadi halaman pengaturan belum bisa digunakan.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Akun Siswa
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Pengaturan
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Perbarui identitas dasar akunmu agar data yang tampil pada dashboard dan riwayat
            belajar tetap akurat.
          </p>
        </div>
      </section>

      <StatusAlert searchParams={Promise.resolve(resolvedSearchParams)} />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.8rem] border border-white/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <StudentProfileAvatar
              image={studentProfile.user.avatarUrl}
              initial={(studentProfile.user.name.slice(0, 1) || "S").toUpperCase()}
            />
            <div>
              <p className="text-xl font-semibold tracking-tight text-slate-950">
                {studentProfile.user.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">{studentProfile.className}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <ProfileInfoRow label="NISN" value={studentProfile.nisn} />
            <ProfileInfoRow label="Kelas" value={studentProfile.className} />
            <ProfileInfoRow
              label="Akun dibuat"
              value={formatDate(studentProfile.createdAt)}
            />
          </div>
        </article>

        <section className="rounded-[1.8rem] border border-white/80 bg-white p-6 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-200/80 pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Perbarui Profil
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Nama lengkap dan kelas bisa diperbarui. NISN ditampilkan sebagai identitas akun dan
              tidak diubah dari halaman ini.
            </p>
          </div>

          <form action={updateStudentProfileAction} className="mt-5 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-3 text-sm font-medium text-slate-700 md:col-span-2">
                <span>Foto Profil</span>
                <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-4 sm:flex-row sm:items-center mt-2">
                  <StudentProfileAvatar
                    image={studentProfile.user.avatarUrl}
                    initial={(studentProfile.user.name.slice(0, 1) || "S").toUpperCase()}
                    sizeClassName="h-20 w-20 text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      name="avatar"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Gunakan gambar PNG, JPG, atau WEBP dengan ukuran maksimal 2 MB.
                    </p>
                  </div>
                </div>
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                <span>Nama Lengkap</span>
                <input
                  type="text"
                  name="name"
                  defaultValue={studentProfile.user.name}
                  required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>NISN</span>
                <input
                  type="text"
                  value={studentProfile.nisn}
                  readOnly
                  className="h-11 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 outline-none"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Kelas</span>
                <input
                  type="text"
                  name="className"
                  defaultValue={studentProfile.className}
                  required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <LoadingSubmitButton
                idleLabel="Simpan Perubahan"
                pendingLabel="Menyimpan..."
                loadingMessage="Menyimpan perubahan profil siswa..."
                className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}

function ProfileInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StudentProfileAvatar({
  image,
  initial,
  sizeClassName = "h-16 w-16 text-lg",
}: {
  image: string | null;
  initial: string;
  sizeClassName?: string;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt="Foto profil siswa"
        width={80}
        height={80}
        className={`${sizeClassName} rounded-full object-cover shadow-[0_14px_28px_rgba(37,99,235,0.18)]`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.2)] ${sizeClassName}`}
    >
      {initial}
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
