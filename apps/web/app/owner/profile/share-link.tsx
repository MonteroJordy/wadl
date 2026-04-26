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
      className="input-dark text-xs font-mono"
    />
  );
}
