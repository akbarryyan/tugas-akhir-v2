"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ConfirmDialogOptions = {
  confirmLabel?: string;
  message: string;
  title: string;
  variant?: "danger" | "neutral";
};

type ConfirmDialogState = ConfirmDialogOptions & {
  open: boolean;
};

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [dialogState, setDialogState] = useState<ConfirmDialogState | null>(null);

  const closeDialog = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialogState(null);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        ...options,
        open: true,
      });
    });
  }, []);

  const value = useMemo(
    () => ({
      confirm,
    }),
    [confirm],
  );

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialogState?.open ? (
        <ConfirmDialogModal
          confirmLabel={dialogState.confirmLabel}
          message={dialogState.message}
          title={dialogState.title}
          variant={dialogState.variant}
          onClose={closeDialog}
        />
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider.");
  }

  return context;
}

function ConfirmDialogModal({
  confirmLabel = "Konfirmasi",
  message,
  onClose,
  title,
  variant = "neutral",
}: ConfirmDialogOptions & {
  onClose: (confirmed: boolean) => void;
}) {
  const confirmButtonClasses =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-500"
      : "bg-slate-950 text-white hover:bg-slate-800";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{message}</p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className={`h-11 rounded-full px-5 text-sm font-semibold transition ${confirmButtonClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
