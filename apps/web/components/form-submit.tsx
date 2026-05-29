"use client";

import { useFormStatus } from "react-dom";
import * as React from "react";

/**
 * Submit button that auto-disables and swaps its label while the
 * enclosing <form action={serverAction}> is pending. Drop-in for the
 * common `<Button type="submit">` pattern — no useTransition wiring
 * required.
 *
 * Usage:
 *   <form action={myAction}>
 *     <FormSubmit pendingLabel="Saving…">Save</FormSubmit>
 *   </form>
 */
type Variant = "primary" | "solid" | "ghost";
type Size = "md" | "lg";

interface FormSubmitProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  pendingLabel?: React.ReactNode;
  children: React.ReactNode;
}

export default function FormSubmit({
  pendingLabel,
  children,
  disabled,
  variant = "primary",
  size,
  block,
  className,
  ...rest
}: FormSubmitProps) {
  const { pending } = useFormStatus();
  const cls = [
    "btn",
    variant === "ghost" ? "btn--ghost" : "",
    size === "lg" ? "btn--lg" : "",
    block ? "btn--block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      {...rest}
      type="submit"
      className={cls}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/**
 * Same idea, but for raw <button> styling (used by tiny inline buttons
 * like "Test", "Rotate secret", "Delete" in the webhooks list — these
 * don't want the Button visual shell).
 */
interface InlineFormSubmitProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  pendingLabel?: React.ReactNode;
  children: React.ReactNode;
}

export function InlineFormSubmit({
  pendingLabel,
  children,
  disabled,
  ...rest
}: InlineFormSubmitProps) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
