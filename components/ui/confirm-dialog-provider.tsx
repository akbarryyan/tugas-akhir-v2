"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ConfirmDialogOptions = {
  beforeClose?: () => void | Promise<void>;
  confirmLabel?: string;
  message: string;
  title: string;
  variant?: "danger" | "neutral";
};

type ConfirmDialogState = ConfirmDialogOptions & {
  open: boolean;
};

const EXIT_DURATION_MS = 220;
const CONFIRMING_DELAY_MS = 720;

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
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialogState, setDialogState] = useState<ConfirmDialogState | null>(null);

  const closeDialog = useCallback((confirmed: boolean) => {
    setDialogState((currentState) =>
      currentState
        ? {
            ...currentState,
            open: false,
          }
        : null,
    );

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      resolverRef.current?.(confirmed);
      resolverRef.current = null;
      setDialogState(null);
      closeTimeoutRef.current = null;
    }, EXIT_DURATION_MS);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

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
      {dialogState ? (
        <ConfirmDialogModal
          beforeClose={dialogState.beforeClose}
          confirmLabel={dialogState.confirmLabel}
          message={dialogState.message}
          open={dialogState.open}
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
  beforeClose,
  confirmLabel = "Konfirmasi",
  message,
  open,
  onClose,
  title,
  variant = "neutral",
}: ConfirmDialogOptions & {
  open: boolean;
  onClose: (confirmed: boolean) => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmButtonClasses =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-500"
      : "bg-slate-950 text-white hover:bg-slate-800";

  useEffect(() => {
    setIsConfirming(false);
  }, [message, title, variant]);

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center px-4 transition-all duration-200 ${
        open ? "bg-slate-950/30 opacity-100 backdrop-blur-[2px]" : "bg-slate-950/0 opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)] transition-all duration-200 ${
          open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-[0.985] opacity-0"
        } ${
          isConfirming ? "scale-[0.992] opacity-95" : ""
        }`}
      >
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{message}</p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => onClose(false)}
            className="h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={async () => {
              setIsConfirming(true);
              await new Promise((resolve) => {
                setTimeout(resolve, CONFIRMING_DELAY_MS);
              });
              await beforeClose?.();
              onClose(true);
            }}
            className={`inline-flex h-11 min-w-[128px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 ${confirmButtonClasses} ${
              isConfirming ? "scale-[0.97] shadow-[0_10px_24px_rgba(15,23,42,0.12)]" : "scale-100"
            } disabled:cursor-not-allowed disabled:opacity-90`}
          >
            {isConfirming ? (
              <>
                <SpinnerIcon />
                Memproses...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
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
