"use client";

import { useEffect } from "react";

export default function DoorError({
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
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-8) var(--s-16)",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <span className="chip chip--err">Page error</span>
        <div
          className="t-display-md"
          style={{ marginTop: "var(--s-4)" }}
        >
          Something went wrong here.
        </div>
        <p
          className="t-body-2"
          style={{ marginTop: "var(--s-2)", marginBottom: "var(--s-6)" }}
        >
          Try refresh, or contact support if it keeps happening.
        </p>
        {error.digest && (
          <p
            className="t-meta"
            style={{ marginBottom: "var(--s-4)" }}
          >
            Ref: {error.digest}
          </p>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-2)",
          }}
        >
          <button
            type="button"
            className="btn btn--block"
            onClick={() => reset()}
          >
            Refresh
          </button>
          <a
            href="mailto:support@wadlwadl.com"
            className="btn btn--ghost btn--block"
            style={{ textDecoration: "none" }}
          >
            Support
          </a>
        </div>
      </div>
    </main>
  );
}
