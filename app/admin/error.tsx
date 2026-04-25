"use client";

import { useEffect } from "react";

export default function OwnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
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
    <main
      id="main-content"
      className="mx-auto max-w-frame md:max-w-2xl px-6 py-12"
    >
      <p className="label-mono text-coral mb-3">⚠ Page error</p>
      <h1 className="display-lg mb-3">Something went wrong here.</h1>
      <p className="text-muted text-sm mb-6">
        Try refresh, or contact support if it keeps happening.
      </p>
      {error.digest && (
        <p className="label-mono text-muted mb-4">ref: {error.digest}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => reset()} className="btn-primary">
          Refresh
        </button>
        <a
          href="mailto:support@wadlwadl.com"
          className="btn-ghost text-center"
        >
          Support
        </a>
      </div>
    </main>
  );
}
