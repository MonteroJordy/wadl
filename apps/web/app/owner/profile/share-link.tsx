"use client";

/**
 * Tiny client wrapper for the "share with venues" input on /owner/profile.
 * Keeps the onFocus auto-select behavior off the server component.
 */
export default function ShareLinkInput({ url }: { url: string }) {
  return (
    <input
      readOnly
      value={url}
      onFocus={(e) => e.currentTarget.select()}
      style={{
        width: "100%",
        background: "var(--w-surface-1)",
        border: "1px solid var(--w-line)",
        color: "var(--w-fg)",
        padding: "10px 12px",
        fontFamily: "var(--w-mono)",
        fontSize: 12,
      }}
    />
  );
}
