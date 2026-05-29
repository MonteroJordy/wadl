"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  /** Controls visibility — parent owns this state. */
  open: boolean;
  /** Headline question. e.g. "Delete this event?" */
  title: string;
  /** Optional explanatory body. Keep short. */
  body?: React.ReactNode;
  /** Label for the destructive/affirmative button. */
  confirmLabel?: string;
  /** Label for the cancel button. */
  cancelLabel?: string;
  /** Highlights the confirm button red. Use for delete/destroy actions. */
  danger?: boolean;
  /** Fires when user confirms. Parent should close the dialog. */
  onConfirm: () => void | Promise<void>;
  /** Fires when user cancels (ESC, backdrop click, Cancel button). */
  onCancel: () => void;
  /** While true, disables both buttons and shows a busy label on confirm. */
  pending?: boolean;
}

/**
 * Branded replacement for window.confirm() — keyboard-accessible
 * (ESC cancels, Enter confirms), focus-trapped, dark/v3-styled.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     title="Delete this webhook?"
 *     body="Incoming requests will stop. You'll need to recreate it."
 *     confirmLabel="Delete"
 *     danger
 *     onConfirm={() => { setOpen(false); doDelete(); }}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
  pending = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Keyboard: ESC closes, Enter confirms. Body scroll-lock while open.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (pending) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        void onConfirm();
      }
    }
    document.addEventListener("keydown", onKey);
    // Focus the confirm button so screen readers + Enter just work.
    setTimeout(() => confirmRef.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the element that opened the dialog.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, pending, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={body ? "confirm-body" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={pending ? undefined : onCancel}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8, 8, 10, 0.7)",
          backdropFilter: "blur(6px)",
        }}
      />
      <div
        className="w-card"
        style={{
          position: "relative",
          maxWidth: 420,
          width: "100%",
          padding: 24,
          background: "var(--w-surface-2)",
          border: "1px solid var(--w-line-2)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
      >
        <h2
          id="confirm-title"
          className="w-type-display-sm"
          style={{ marginTop: 0, marginBottom: body ? 8 : 16 }}
        >
          {title}
        </h2>
        {body && (
          <p
            id="confirm-body"
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            {body}
          </p>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? "btn btn--danger" : "btn btn--accent"}
            onClick={() => void onConfirm()}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
