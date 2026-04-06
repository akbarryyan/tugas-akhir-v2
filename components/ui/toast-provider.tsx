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

type ToastType = "error" | "info" | "loading" | "success";

type ToastInput = {
  duration?: number;
  message: string;
  title?: string;
  type: ToastType;
};

type ToastItem = {
  duration?: number;
  id: string;
  message: string;
  state: "entering" | "idle" | "leaving";
  title?: string;
  type: ToastType;
};

type ToastUpdateInput = Partial<
  Omit<ToastInput, "type"> & {
    type: ToastType;
  }
>;

type ToastContextValue = {
  dismissToast: (id: string) => void;
  showToast: (input: ToastInput) => string;
  toastPromise: <T>(
    promise: Promise<T>,
    messages: {
      error: string | ((error: unknown) => string);
      loading: string;
      success: string | ((value: T) => string);
    },
  ) => Promise<T>;
  updateToast: (id: string, input: ToastUpdateInput) => void;
};

const DEFAULT_DURATION = 2400;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissTimeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const enterTimeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const createToastId = useCallback(() => {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const dismissToast = useCallback((id: string) => {
    const enterTimeout = enterTimeoutMapRef.current.get(id);
    const existingTimeout = dismissTimeoutMapRef.current.get(id);

    if (enterTimeout) {
      clearTimeout(enterTimeout);
      enterTimeoutMapRef.current.delete(id);
    }

    if (existingTimeout) {
      clearTimeout(existingTimeout);
      dismissTimeoutMapRef.current.delete(id);
    }

    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id
          ? {
              ...toast,
              state: "leaving",
            }
          : toast,
      ),
    );

    const removalTimeout = setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id),
      );
      dismissTimeoutMapRef.current.delete(id);
    }, 220);

    dismissTimeoutMapRef.current.set(id, removalTimeout);
  }, []);

  const queueAutoDismiss = useCallback(
    (id: string, duration?: number) => {
      const existingTimeout = dismissTimeoutMapRef.current.get(id);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
        dismissTimeoutMapRef.current.delete(id);
      }

      if (!duration) {
        return;
      }

      const autoDismissTimeout = setTimeout(() => {
        dismissToast(id);
      }, duration);

      dismissTimeoutMapRef.current.set(id, autoDismissTimeout);
    },
    [dismissToast],
  );

  const updateToast = useCallback(
    (id: string, input: ToastUpdateInput) => {
      setToasts((currentToasts) =>
        currentToasts.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                ...input,
              }
            : toast,
        ),
      );

      queueAutoDismiss(id, input.duration);
    },
    [queueAutoDismiss],
  );

  const showToast = useCallback(
    ({ duration = DEFAULT_DURATION, message, title, type }: ToastInput) => {
      const id = createToastId();

      setToasts((currentToasts) => [
        ...currentToasts,
        {
          duration,
          id,
          message,
          state: "entering",
          title,
          type,
        },
      ]);

      const enterTimeout = setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.map((toast) =>
            toast.id === id
              ? {
                  ...toast,
                  state: "idle",
                }
              : toast,
          ),
        );
      }, 80);

      enterTimeoutMapRef.current.set(id, enterTimeout);
      queueAutoDismiss(id, type === "loading" ? undefined : duration);

      return id;
    },
    [createToastId, queueAutoDismiss],
  );

  const toastPromise = useCallback(
    async <T,>(
      promise: Promise<T>,
      messages: {
        error: string | ((error: unknown) => string);
        loading: string;
        success: string | ((value: T) => string);
      },
    ) => {
      const toastId = showToast({
        message: messages.loading,
        type: "loading",
      });

      try {
        const value = await promise;
        updateToast(toastId, {
          duration: DEFAULT_DURATION,
          message:
            typeof messages.success === "function"
              ? messages.success(value)
              : messages.success,
          type: "success",
        });
        return value;
      } catch (error) {
        updateToast(toastId, {
          duration: DEFAULT_DURATION,
          message:
            typeof messages.error === "function"
              ? messages.error(error)
              : messages.error,
          type: "error",
        });
        throw error;
      }
    },
    [showToast, updateToast],
  );

  const value = useMemo(
    () => ({
      dismissToast,
      showToast,
      toastPromise,
      updateToast,
    }),
    [dismissToast, showToast, toastPromise, updateToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}

function ToastViewport({
  onDismiss,
  toasts,
}: {
  onDismiss: (id: string) => void;
  toasts: ToastItem[];
}) {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const stateClasses =
          toast.state === "entering"
            ? "translate-y-0 opacity-100"
            : toast.state === "leaving"
              ? "-translate-y-2 opacity-0"
              : "translate-y-0 opacity-100";

        const colorClasses =
          toast.type === "success"
            ? "border-emerald-200"
            : toast.type === "error"
              ? "border-rose-200"
              : toast.type === "loading"
                ? "border-amber-200"
                : "border-sky-200";

        const title =
          toast.title ??
          (toast.type === "success"
            ? "Berhasil"
            : toast.type === "error"
              ? "Periksa Lagi"
              : toast.type === "loading"
                ? "Memproses"
                : "Informasi");

        const titleClasses =
          toast.type === "success"
            ? "text-emerald-700"
            : toast.type === "error"
              ? "text-rose-700"
              : toast.type === "loading"
                ? "text-amber-700"
                : "text-sky-700";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-[1.25rem] border bg-white px-4 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.16)] transition-all duration-200 ${stateClasses} ${colorClasses}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold ${titleClasses}`}>
                  {toast.type === "loading" ? (
                    <span className="mr-2 inline-block size-2 rounded-full bg-current align-middle animate-pulse" />
                  ) : null}
                  {title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-sm font-medium text-slate-400 transition hover:text-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
