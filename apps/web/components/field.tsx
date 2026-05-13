"use client";

import * as React from "react";

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  /** Inline help shown under the label. */
  hint?: React.ReactNode;
  /** Validation error to display + announce to assistive tech. */
  error?: string | null;
  /** Marks the field visually + sets `aria-required` via context. */
  required?: boolean;
  /** Optional action slot in the label row (e.g. "Forgot?"). */
  action?: React.ReactNode;
  children: React.ReactElement;
}

/**
 * Accessible label/hint/error wrapper around any input. Wires up
 * htmlFor → id, aria-describedby for hint + error, and aria-invalid on
 * the child input. Replaces the ad-hoc <label className="w-label"> +
 * inline <p style={{ color: var(--w-err) }}> pattern with a single
 * consistent component.
 *
 * Usage:
 *   <Field label="Email" htmlFor="email" error={errors.email}>
 *     <input id="email" type="email" className="w-input" />
 *   </Field>
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  action,
  children,
}: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errId = error ? `${htmlFor}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;

  const child = React.cloneElement(children, {
    id: htmlFor,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <label
          htmlFor={htmlFor}
          className="w-label"
          style={{ marginBottom: 0 }}
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              style={{ color: "var(--w-err)", marginInlineStart: 4 }}
            >
              *
            </span>
          )}
        </label>
        {action}
      </div>
      {child}
      {hint && !error && (
        <p
          id={hintId}
          className="w-type-meta"
          style={{ color: "var(--w-fg-dim)", marginTop: 2 }}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errId}
          role="alert"
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginTop: 2, lineHeight: 1.35 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Standalone field-level error, for forms that build their own layout
 * and just need an accessible error pill underneath an input.
 */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="w-type-body-sm"
      style={{ color: "var(--w-err)", marginTop: 6, lineHeight: 1.35 }}
    >
      {children}
    </p>
  );
}
