"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
};

type LoadingSubmitButtonProps = {
  className?: string;
  idleLabel: string;
  loadingMessage: string;
  pendingLabel: string;
};

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
  confirmMessage,
  confirmTitle = "Konfirmasi Penghapusan",
}: ConfirmDeleteButtonProps) {
  return (
    <ConfirmActionButton
      confirmLabel="Ya, hapus"
      confirmMessage={confirmMessage}
      confirmTitle={confirmTitle}
      variant="danger"
      className="h-10 rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
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
        router.push(pathname);
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

  useEffect(() => {
    if (pending && !activeToastIdRef.current) {
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
    }
  }, [dismissToast, loadingMessage, pending, showToast]);

  useEffect(() => {
    return () => {
      if (activeToastIdRef.current) {
        dismissToast(activeToastIdRef.current);
      }
    };
  }, [dismissToast]);

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function ResetSearchButton() {
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
        router.push(pathname);
      }}
      className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      Reset
    </button>
  );
}
