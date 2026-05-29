"use client";

import { useEffect } from "react";

export default function AdminError({
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          className="w-type-meta"
          style={{ color: "var(--w-err)", marginBottom: 8 }}
        >
          ⚠ PAGE ERROR
        </div>
        <div className="w-type-display-md" style={{ marginBottom: 12 }}>
          Something went wrong here.
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)", marginBottom: 24 }}
        >
          Try refresh, or contact support if it keeps happening.
        </p>
        {error.digest && (
          <p
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", marginBottom: 16 }}
          >
            REF: {error.digest}
          </p>
        )}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <button className="btn btn--block" type="button" onClick={() => reset()}>
            Refresh
          </button>
          <a
            href="mailto:support@wadlwadl.com"
            style={{ textDecoration: "none" }}
          >
            <button className="btn btn--ghost btn--block" type="button">
              Support
            </button>
          </a>
        </div>
      </div>
    </main>
  );
}
