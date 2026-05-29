"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  /** Fires when the user taps the action. Toast auto-dismisses after. */
  onClick: () => void | Promise<void>;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Optional action button on the toast (e.g. "Undo"). */
  action?: ToastAction;
  /** Override auto-dismiss ms. Default 4000. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  show: (message: string, options?: ToastOptions | ToastTone) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  // SSR / no-provider fallback. Logs instead of crashing.
  function toneOf(o?: ToastOptions | ToastTone): ToastTone {
    if (!o) return "info";
    return typeof o === "string" ? o : o.tone ?? "info";
  }
  return {
    show: (m, o) => console.log(`[toast:${toneOf(o)}] ${m}`),
    success: (m) => console.log(`[toast:success] ${m}`),
    error: (m) => console.error(`[toast:error] ${m}`),
    warning: (m) => console.warn(`[toast:warning] ${m}`),
    info: (m) => console.log(`[toast:info] ${m}`),
  };
}

const TONE_STYLES: Record<ToastTone, React.CSSProperties> = {
  success: {
    borderColor: "var(--w-ok)",
    color: "var(--w-ok)",
  },
  error: {
    borderColor: "var(--w-err)",
    color: "var(--w-err)",
  },
  warning: {
    borderColor: "var(--w-warn)",
    color: "var(--w-warn)",
  },
  info: {
    borderColor: "var(--w-line)",
    color: "var(--w-fg)",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions | ToastTone) => {
      const opts: ToastOptions =
        typeof options === "string"
          ? { tone: options }
          : options ?? {};
      const tone = opts.tone ?? "info";
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message, action: opts.action }]);
      // Toasts with actions linger longer so the user can react.
      const duration = opts.durationMs ?? (opts.action ? 7000 : 4000);
      setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  const withTone =
    (tone: ToastTone) =>
    (m: string, options?: ToastOptions) =>
      show(m, { ...(options ?? {}), tone });

  const api: ToastApi = {
    show,
    success: withTone("success"),
    error: withTone("error"),
    warning: withTone("warning"),
    info: withTone("info"),
  };

  return (
    <ToastContext.Provider value={api}>
      <style>{`@keyframes wadlToastIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="w-toast-stack"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 380,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            style={{
              pointerEvents: "auto",
              padding: "12px 16px",
              border: "1px solid",
              background: "var(--w-surface-2)",
              backdropFilter: "blur(4px)",
              fontSize: 14,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
              animation: "wadlToastIn 200ms ease-out",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              ...TONE_STYLES[t.tone],
            }}
          >
            <div style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</div>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  void t.action!.onClick();
                  remove(t.id);
                }}
                className="w-type-meta"
                style={{
                  flexShrink: 0,
                  padding: "4px 8px",
                  background: "transparent",
                  border: "1px solid currentColor",
                  color: "inherit",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {t.action.label.toUpperCase()}
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              style={{
                flexShrink: 0,
                width: 20,
                height: 20,
                background: "transparent",
                border: 0,
                color: "inherit",
                opacity: 0.6,
                cursor: "pointer",
                fontFamily: "var(--w-mono)",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
