"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useConfirmDialog } from "@/components/ui/confirm-dialog-provider";

const PRE_CONFIRM_DELAY_MS = 480;

type StartTryoutButtonProps = {
  className?: string;
  confirmMessage?: string;
  confirmTitle?: string;
  href: string;
  idleLabel?: string;
  pendingLabel?: string;
};

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function StartTryoutButton({
  className,
  confirmMessage = "Pastikan kamu sudah siap. Setelah masuk mode ujian, fokuskan pengerjaan tryout sampai selesai dikirim.",
  confirmTitle = "Mulai mengerjakan tryout?",
  href,
  idleLabel = "Mulai Tryout",
  pendingLabel = "Menyiapkan...",
}: StartTryoutButtonProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRouting, startTransition] = useTransition();

  const isPending = isPreparing || isRouting;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={async () => {
        setIsPreparing(true);
        await wait(PRE_CONFIRM_DELAY_MS);
        setIsPreparing(false);

        const isConfirmed = await confirm({
          confirmLabel: "Mulai Sekarang",
          message: confirmMessage,
          title: confirmTitle,
          variant: "neutral",
        });

        if (!isConfirmed) {
          return;
        }

        startTransition(() => {
          router.push(href);
        });
      }}
      className={className}
    >
      {isPending ? (
        <>
          <SpinnerIcon />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
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
        className="stroke-white/35"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="stroke-white"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
