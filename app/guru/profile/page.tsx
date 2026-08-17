import Image from "next/image";
import Link from "next/link";
import { AuthMethod, Role } from "@prisma/client";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function GuruProfilePage() {
  const session = await requireRole([Role.GURU]);
  const teacher = await prisma.user.findUnique({
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
      teacherProfile: {
        select: {
          nip: true,
          subjectTeachers: {
            select: {
              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      updatedAt: true,
    },
  });

  const profile = teacher ?? {
    authMethod: session.user.authMethod,
    avatarUrl: session.user.image ?? null,
    createdAt: null,
    email: session.user.email ?? null,
    name: session.user.name ?? "Guru",
    role: session.user.role,
    teacherProfile: {
      nip: null,
      subjectTeachers: [],
    },
    updatedAt: null,
  };
  const teacherProfile = profile.teacherProfile ?? { nip: null, subjectTeachers: [] };
  const initial = profile.name.slice(0, 1).toUpperCase();
  // Satu mata pelajaran dapat diampu pada beberapa kelas, jadi daftarnya
  // diringkas agar tidak menampilkan nama mapel yang sama berulang kali.
  const subjects = Array.from(
    new Map(
      teacherProfile.subjectTeachers.map((item) => [item.subject.id, item.subject]),
    ).values(),
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 bg-white px-6 py-7">
            <div className="flex items-center gap-4">
              <TeacherProfileAvatar
                image={profile.avatarUrl}
                initial={initial}
                sizeClassName="h-20 w-20 text-2xl"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">
                  Profil Guru
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
              label="NIP"
              value={teacherProfile.nip ?? "-"}
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
          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Informasi Guru
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ringkasan identitas akun guru dan mata pelajaran yang saat ini
                  menjadi area kerja Anda di sistem.
                </p>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                Aktif
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoCard label="Nama Lengkap" value={profile.name} />
              <InfoCard
                label="Email"
                value={profile.email ?? "Belum tersedia"}
              />
              <InfoCard
                label="NIP"
                value={teacherProfile.nip ?? "-"}
              />
              <InfoCard
                label="Jumlah Mapel"
                value={String(subjects.length)}
              />
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-900">
              Mata Pelajaran Ampuan
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {subjects.length > 0 ? (
                subjects.map((subject) => (
                  <span
                    key={subject.id}
                    className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"
                  >
                    {subject.name}
                  </span>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                  Belum ada mata pelajaran ampuan yang terhubung ke akun guru ini.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-slate-900">
              Catatan Akses
            </p>
            <div className="mt-4 grid gap-3">
              <SecurityNote>
                Gunakan akun guru ini hanya untuk mengelola soal, bank soal, dan tryout yang relevan dengan mata pelajaran ampuan Anda.
              </SecurityNote>
              <SecurityNote>
                Pastikan data soal dan paket tryout ditinjau ulang sebelum dipublikasikan ke siswa.
              </SecurityNote>
              <SecurityNote>
                Jika ada data akun yang belum sesuai, hubungi admin sekolah untuk pembaruan profil guru.
              </SecurityNote>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href="/guru"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition hover:border-blue-200 hover:text-blue-600"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

function TeacherProfileAvatar({
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
        alt="Foto profil guru"
        width={80}
        height={80}
        className={`${sizeClassName} rounded-full object-cover ring-2 ring-blue-100`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#60a5fa_0%,#2563eb_58%,#38bdf8_100%)] font-semibold text-white`}
    >
      {initial}
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
    <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SecurityNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-600">
      {children}
    </div>
  );
}

function formatRole(role: Role) {
  return role === Role.GURU ? "Guru" : role;
}

function formatAuthMethod(authMethod: AuthMethod) {
  return authMethod === AuthMethod.EMAIL_PASSWORD
    ? "Email & Password"
    : "Portal";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
