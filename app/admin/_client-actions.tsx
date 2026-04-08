"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { useConfirmDialog } from "@/components/ui/confirm-dialog-provider";
import { useToast } from "@/components/ui/toast-provider";

type ConfirmActionButtonProps = {
  children: ReactNode;
  className?: string;
  confirmLabel?: string;
  confirmMessage: string;
  confirmTitle: string;
  onConfirmed?: (context: { form: HTMLFormElement | null }) => void | Promise<void>;
  variant?: "danger" | "neutral";
};

type ConfirmDeleteButtonProps = {
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  confirmTitle?: string;
};

type ConfirmResetFormButtonProps = {
  children?: ReactNode;
  confirmMessage?: string;
  confirmTitle?: string;
};

type ConfirmResetSearchButtonProps = {
  children?: ReactNode;
  confirmMessage?: string;
  confirmTitle?: string;
  href?: string;
};

type LoadingSubmitButtonProps = {
  className?: string;
  idleLabel: string;
  loadingMessage: string;
  pendingLabel: string;
};

const MIN_BUTTON_LOADING_MS = 1100;

export function ConfirmActionButton({
  children,
  className,
  confirmLabel = "Konfirmasi",
  confirmMessage,
  confirmTitle,
  onConfirmed,
  variant = "neutral",
}: ConfirmActionButtonProps) {
  const { confirm } = useConfirmDialog();

  return (
    <button
      type="button"
      onClick={async (event) => {
        const form = event.currentTarget.form;

        const isConfirmed = await confirm({
          confirmLabel,
          message: confirmMessage,
          title: confirmTitle,
          variant,
        });

        if (!isConfirmed) {
          return;
        }

        if (onConfirmed) {
          await onConfirmed({ form });
          return;
        }

        if (!form) {
          return;
        }

        form.requestSubmit();
      }}
      className={className}
    >
      {children}
    </button>
  );
}

export function ConfirmDeleteButton({
  children,
  className,
  confirmMessage,
  confirmTitle = "Konfirmasi Penghapusan",
}: ConfirmDeleteButtonProps) {
  return (
    <ConfirmActionButton
      confirmLabel="Ya, hapus"
      confirmMessage={confirmMessage}
      confirmTitle={confirmTitle}
      variant="danger"
      className={
        className ??
        "h-10 rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
      }
    >
      {children}
    </ConfirmActionButton>
  );
}

export function ConfirmResetFormButton({
  children = "Kosongkan Form",
  confirmMessage = "Isi form yang belum disimpan akan dikosongkan. Anda dapat mengisi kembali data setelahnya.",
  confirmTitle = "Kosongkan Form",
}: ConfirmResetFormButtonProps) {
  const { showToast } = useToast();

  return (
    <ConfirmActionButton
      confirmLabel="Ya, kosongkan"
      confirmMessage={confirmMessage}
      confirmTitle={confirmTitle}
      onConfirmed={({ form }) => {
        if (!form) {
          return;
        }

        form.reset();
        showToast({
          message: "Form berhasil dikosongkan.",
          type: "info",
        });
      }}
      className="h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </ConfirmActionButton>
  );
}

export function ConfirmResetSearchButton({
  children = "Reset",
  confirmMessage = "Filter pencarian akan dikembalikan ke keadaan awal.",
  confirmTitle = "Reset Filter Pencarian",
  href,
}: ConfirmResetSearchButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <ConfirmActionButton
      confirmLabel="Ya, reset"
      confirmMessage={confirmMessage}
      confirmTitle={confirmTitle}
      onConfirmed={() => {
        showToast({
          message: "Filter pencarian telah dikembalikan.",
          type: "info",
        });
        router.push(href ?? pathname);
      }}
      className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </ConfirmActionButton>
  );
}

export function LoadingSubmitButton({
  className,
  idleLabel,
  loadingMessage,
  pendingLabel,
}: LoadingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const { dismissToast, showToast } = useToast();
  const activeToastIdRef = useRef<string | null>(null);
  const loadingStartRef = useRef<number | null>(null);
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisualPending, setIsVisualPending] = useState(false);

  useEffect(() => {
    if (pending && !activeToastIdRef.current) {
      loadingStartRef.current = Date.now();
      setIsVisualPending(true);

      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
        releaseTimeoutRef.current = null;
      }

      activeToastIdRef.current = showToast({
        duration: undefined,
        message: loadingMessage,
        type: "loading",
      });
      return;
    }

    if (!pending && activeToastIdRef.current) {
      dismissToast(activeToastIdRef.current);
      activeToastIdRef.current = null;

      const elapsed = loadingStartRef.current
        ? Date.now() - loadingStartRef.current
        : MIN_BUTTON_LOADING_MS;
      const remaining = Math.max(0, MIN_BUTTON_LOADING_MS - elapsed);

      if (remaining === 0) {
        setIsVisualPending(false);
        loadingStartRef.current = null;
        return;
      }

      releaseTimeoutRef.current = setTimeout(() => {
        setIsVisualPending(false);
        loadingStartRef.current = null;
        releaseTimeoutRef.current = null;
      }, remaining);
    }
  }, [dismissToast, loadingMessage, pending, showToast]);

  useEffect(() => {
    return () => {
      if (activeToastIdRef.current) {
        dismissToast(activeToastIdRef.current);
      }

      if (releaseTimeoutRef.current) {
        clearTimeout(releaseTimeoutRef.current);
      }
    };
  }, [dismissToast]);

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || isVisualPending}
    >
      {isVisualPending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SpinnerIcon />
          {pendingLabel}
        </span>
      ) : (
        idleLabel
      )}
    </button>
  );
}

export function ResetSearchButton({ href }: { href?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <button
      type="button"
      onClick={() => {
        showToast({
          message: "Filter pencarian telah dikembalikan.",
          type: "info",
        });
        router.push(href ?? pathname);
      }}
      className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      Reset
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
