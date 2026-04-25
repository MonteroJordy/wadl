"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  // Outside-of-provider safe stub: log to console so dev sees the call,
  // and return a no-op API so calling code never crashes.
  return {
    show: (m, tone = "info") => console.log(`[toast:${tone}] ${m}`),
    success: (m) => console.log(`[toast:success] ${m}`),
    error: (m) => console.error(`[toast:error] ${m}`),
    warning: (m) => console.warn(`[toast:warning] ${m}`),
    info: (m) => console.log(`[toast:info] ${m}`),
  };
}

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "border-mint/60 bg-mint/15 text-mint",
  error: "border-coral/60 bg-coral/15 text-coral",
  warning: "border-gold/60 bg-gold/15 text-gold",
  info: "border-line bg-s2 text-cream",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const api: ToastApi = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    warning: (m) => show(m, "warning"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto px-4 py-3 rounded-md border backdrop-blur-sm font-sans text-sm shadow-lg shadow-black/40 animate-toast-in ${TONE_CLASSES[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
