"use client";

import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "next-auth/react";

import { useConfirmDialog } from "@/components/ui/confirm-dialog-provider";
import { useToast } from "@/components/ui/toast-provider";

type SignOutButtonProps = {
  className?: string;
  confirmMessage?: string;
  confirmTitle?: string;
  pendingLabel?: ReactNode;
};

const TOAST_BEFORE_CLOSE_DELAY_MS = 180;
const POST_SUCCESS_REDIRECT_DELAY_MS = 420;

export function SignOutButton({
  className,
  confirmMessage = "Sesi Anda akan diakhiri dan Anda akan diarahkan kembali ke halaman masuk.",
  confirmTitle = "Keluar dari Portal",
  pendingLabel = (
    <span className="inline-flex items-center gap-2">
      <SpinnerIcon />
      Keluar...
    </span>
  ),
}: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm } = useConfirmDialog();
  const { showToast, updateToast } = useToast();
  const activeToastIdRef = useRef<string | null>(null);

  return (
    <button
      type="button"
      onClick={async () => {
        const isConfirmed = await confirm({
          beforeClose: async () => {
            if (activeToastIdRef.current) {
              return;
            }

            activeToastIdRef.current = showToast({
              duration: undefined,
              message: "Mengakhiri sesi Anda...",
              type: "loading",
            });

            await new Promise((resolve) => {
              setTimeout(resolve, TOAST_BEFORE_CLOSE_DELAY_MS);
            });
          },
          confirmLabel: "Ya, keluar",
          message: confirmMessage,
          title: confirmTitle,
          variant: "neutral",
        });

        if (!isConfirmed) {
          return;
        }

        startTransition(async () => {
          try {
            await signOut({
              callbackUrl: "/login",
              redirect: false,
            });

            if (activeToastIdRef.current) {
              updateToast(activeToastIdRef.current, {
                duration: 2400,
                message: "Sesi berhasil diakhiri.",
                type: "success",
              });
              activeToastIdRef.current = null;
            }
          } catch {
            if (activeToastIdRef.current) {
              updateToast(activeToastIdRef.current, {
                duration: 2400,
                message: "Keluar dari portal gagal. Silakan coba lagi.",
                type: "error",
              });
              activeToastIdRef.current = null;
            }
            return;
          }

          await new Promise((resolve) => {
            setTimeout(resolve, POST_SUCCESS_REDIRECT_DELAY_MS);
          });
          router.push("/login");
          router.refresh();
        });
      }}
      className={
        className ??
        "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      }
      disabled={isPending}
    >
      {isPending ? pendingLabel : "Keluar"}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        className="stroke-current/30"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="stroke-current"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
