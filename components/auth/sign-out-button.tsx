"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  className?: string;
  pendingLabel?: ReactNode;
};

export function SignOutButton({
  className,
  pendingLabel = "Keluar...",
}: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await signOut({
            callbackUrl: "/login",
            redirect: false,
          });

          router.push("/login");
          router.refresh();
        });
      }}
      className={
        className ??
        "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      }
      disabled={isPending}
    >
      {isPending ? pendingLabel : "Keluar"}
    </button>
  );
}
