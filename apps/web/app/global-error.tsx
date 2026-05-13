"use client";

import { useEffect } from "react";

/**
 * Last-resort error UI that fires when something blows up inside the
 * root layout itself — at that point `app/error.tsx` isn't mounted yet
 * so we need a self-contained page that ships its own <html>/<body>.
 *
 * Keep this file dependency-light: no design tokens, no fonts, no
 * shared components. If the import graph is what crashed, you don't
 * want this page to crash too.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      fetch("/api/log/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          digest: error.digest,
          stack: error.stack,
          url: typeof window !== "undefined" ? window.location.href : null,
          scope: "global",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* swallow — global error must never throw */
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0f0f10",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#ff5b5b",
              marginBottom: 12,
            }}
          >
            ⚠ FATAL · APP CRASH
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              marginBottom: 12,
            }}
          >
            Something broke hard.
          </h1>
          <p
            style={{
              color: "#9b9ba0",
              fontSize: 14,
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            The app couldn't recover on its own. Reload, or email support
            with the ref below if it keeps happening.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "#6b6b70",
                marginBottom: 20,
              }}
            >
              REF: {error.digest}
            </p>
          )}
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "12px 16px",
                background: "#f5ff37",
                color: "#0f0f10",
                border: 0,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <a
              href="mailto:support@wadlwadl.com"
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "#fafafa",
                border: "1px solid #2a2a2e",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Email support
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
