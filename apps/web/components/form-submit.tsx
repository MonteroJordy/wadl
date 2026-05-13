"use client";

import { useFormStatus } from "react-dom";
import * as React from "react";
import { Button } from "@/components/wadl";

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
  ...rest
}: FormSubmitProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...rest}
      type="submit"
      variant={variant}
      size={size}
      block={block}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
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
