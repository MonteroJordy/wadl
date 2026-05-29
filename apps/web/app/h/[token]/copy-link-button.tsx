"use client";

import { useState } from "react";

interface Props {
  /**
   * Fully-qualified absolute URL to copy (e.g. https://wadl.app/d/abc123).
   * Resolved server-side via getAppUrl() so the copied value is always a
   * usable link, never a relative path.
   */
  url: string;
  label?: string;
}

/**
 * Client-side clipboard wrapper. The `url` prop is already absolute — we
 * copy it verbatim. If the server somehow passed a relative path we still
 * resolve it against the page origin as a defensive fallback.
 */
export default function CopyLinkButton({ url, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const full =
      url.startsWith("http") || typeof window === "undefined"
        ? url
        : new URL(url, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: open prompt with the URL.
      window.prompt("Copy link:", full);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="btn btn--ghost btn--sm"
      style={{ flexShrink: 0 }}
    >
      {copied ? (
        "✓ Copied"
      ) : (
        <>
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="9"
              width="11"
              height="11"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M5 15V5a2 2 0 0 1 2-2h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
