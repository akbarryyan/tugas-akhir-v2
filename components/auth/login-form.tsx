"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { signIn } from "next-auth/react";

import { useToast } from "@/components/ui/toast-provider";

type LoginMode = "staff" | "student";

type LoginFormProps = {
  callbackUrl: string;
};

const modeCopy: Record<
  LoginMode,
  {
    description: string;
    subtitle: string;
    submitLabel: string;
    title: string;
  }
> = {
  staff: {
    title: "Masuk untuk Admin dan Guru",
    subtitle: "Gunakan akun yang telah didaftarkan oleh sekolah.",
    description:
      "Silakan gunakan email dan password yang aktif. Jika mengalami kendala akses, hubungi pengelola sistem sekolah.",
    submitLabel: "Masuk ke Portal",
  },
  student: {
    title: "Masuk untuk Siswa",
    subtitle: "Gunakan NISN yang sudah terdaftar di sekolah.",
    description:
      "Kamu tidak perlu membuat akun baru. Cukup masukkan NISN, lalu sistem akan mencocokkannya dengan data siswa yang tersedia.",
    submitLabel: "Lanjut Masuk",
  },
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const { toastPromise } = useToast();
  const [mode, setMode] = useState<LoginMode>("staff");
  const [isPending, startTransition] = useTransition();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  function scheduleRedirect(url: string) {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    redirectTimeoutRef.current = setTimeout(() => {
      router.push(url);
      router.refresh();
    }, 1800);
  }

  async function handleStaffLogin(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const result = await toastPromise(
        (async () => {
          const signInResult = await signIn("staff-credentials", {
            email,
            password,
            redirect: false,
            callbackUrl,
          });

          if (!signInResult || signInResult.error) {
            throw new Error("Email atau password tidak valid.");
          }

          return signInResult;
        })(),
        {
          error: (error) =>
            error instanceof Error
              ? error.message
              : "Login belum berhasil. Periksa kembali data Anda.",
          loading: "Memeriksa akun admin atau guru...",
          success: "Login berhasil. Anda akan diarahkan ke portal.",
        },
      );

      scheduleRedirect(result.url ?? callbackUrl);
    } catch {
      return;
    }
  }

  async function handleStudentLogin(formData: FormData) {
    const nisn = String(formData.get("nisn") ?? "");

    try {
      const result = await toastPromise(
        (async () => {
          const signInResult = await signIn("student-nisn", {
            nisn,
            redirect: false,
            callbackUrl,
          });

          if (!signInResult || signInResult.error) {
            throw new Error("NISN tidak ditemukan atau belum aktif.");
          }

          return signInResult;
        })(),
        {
          error: (error) =>
            error instanceof Error
              ? error.message
              : "NISN belum bisa diproses. Coba lagi sebentar.",
          loading: "Mencocokkan NISN dengan data siswa...",
          success:
            "Login berhasil. Tunggu sebentar, kamu akan masuk ke halaman berikutnya.",
        },
      );

      scheduleRedirect(result.url ?? callbackUrl);
    } catch {
      return;
    }
  }

  const content = modeCopy[mode];

  return (
    <div className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="grid gap-3">
        <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("staff");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "staff"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admin / Guru
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("student");
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "student"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Siswa
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {content.title}
          </h2>
          <p className="text-sm leading-6 text-slate-600">{content.subtitle}</p>
          <p className="text-sm leading-6 text-slate-500">{content.description}</p>
        </div>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            if (mode === "staff") {
              await handleStaffLogin(formData);
              return;
            }

            await handleStudentLogin(formData);
          });
        }}
      >
        {mode === "staff" ? (
          <>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Masukkan email Anda"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500"
                required
              />
              <span className="text-xs font-normal leading-5 text-slate-500">
                Gunakan email yang terdaftar sebagai admin atau guru.
              </span>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password Anda"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500"
                required
              />
              <span className="text-xs font-normal leading-5 text-slate-500">
                Periksa kembali penulisan huruf besar dan kecil pada password.
              </span>
            </label>
          </>
        ) : (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            NISN
            <input
              name="nisn"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Masukkan NISN kamu"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500"
              required
            />
            <span className="text-xs font-normal leading-5 text-slate-500">
              Gunakan NISN yang terdaftar di sekolah. Kalau belum bisa masuk,
              hubungi guru atau admin sekolah.
            </span>
          </label>
        )}

        <button
          type="submit"
          className="mt-2 h-12 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "Memproses..." : content.submitLabel}
        </button>
      </form>
    </div>
  );
}
