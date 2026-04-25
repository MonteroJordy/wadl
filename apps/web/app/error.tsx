"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort log to our error sink. Falls back silently in dev.
    fetch("/api/log/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.href : null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <main id="main-content" className="mobile-frame">
      <div className="pt-12 text-center">
        <p className="label-mono mb-3 text-coral">⚠ Something broke</p>
        <h1 className="display-lg mb-3">We hit a snag.</h1>
        <p className="text-muted text-sm leading-relaxed mb-6">
          Try again, or reach support if it keeps happening.
        </p>
        {error.digest && (
          <p className="label-mono text-muted mb-4">ref: {error.digest}</p>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => reset()} className="btn-primary">
            Try again
          </button>
          <a
            href="mailto:support@wadlwadl.com"
            className="btn-ghost text-center"
          >
            Email support
          </a>
        </div>
      </div>
    </main>
  );
}
