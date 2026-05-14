"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  "Plans changed",
  "Found a conflict",
  "Not feeling it",
  "Sick",
  "Other",
];

const SHELL_STYLE: React.CSSProperties = {
  marginInline: "auto",
  width: "100%",
  maxWidth: 420,
  minHeight: "100vh",
  background: "var(--bg)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  paddingBottom: "var(--s-12)",
};

export default function CancelRsvpPage() {
  const router = useRouter();
  const [reason, setReason] = useState(REASONS[0]);
  const [pending, setPending] = useState(false);

  function onCancel() {
    setPending(true);
    // Stub — backend cancellation flow is not yet implemented. Wire up
    // a server action when the cancellation table lands.
    setTimeout(() => {
      router.push("/mytickets");
    }, 600);
  }

  return (
    <main id="main-content" className="v5">
      <div style={SHELL_STYLE}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--s-4) var(--s-5) 0",
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="t-meta"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--fg-3)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Back
          </button>
          <span className="t-meta">Cancel RSVP</span>
          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: "var(--s-6) var(--s-5) 0" }}>
          <div className="t-meta">You&apos;re cancelling</div>
          <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
            Your spot
          </div>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-1)" }}
          >
            We&apos;ll release your hold and let the host know.
          </p>
        </div>

        <div style={{ padding: "var(--s-5) var(--s-5) 0" }}>
          <div
            className="card"
            style={{
              padding: "var(--s-4)",
              borderColor: "var(--ok)",
            }}
          >
            <span className="chip chip--ok">Free cancellation window</span>
            <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              You&apos;re ahead of the cutoff. No reputation hit, any hold is
              released in full.
            </p>
          </div>
        </div>

        <div style={{ padding: "var(--s-6) var(--s-5) 0" }}>
          <div className="t-meta">Reason (optional)</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
              marginTop: "var(--s-3)",
            }}
          >
            {REASONS.map((r) => {
              const active = reason === r;
              return (
                <label
                  key={r}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-3)",
                    padding: "var(--s-4)",
                    border: "1px solid",
                    borderRadius: "var(--r-md)",
                    borderColor: active ? "var(--fg)" : "var(--line-2)",
                    background: active ? "var(--bg-3)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={active}
                    onChange={() => setReason(r)}
                    style={{ accentColor: "var(--fg)" }}
                  />
                  <span className="t-body">{r}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: "var(--s-5)",
            background:
              "linear-gradient(to top, var(--bg) 60%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
            marginTop: "auto",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn btn--danger btn--block"
          >
            {pending ? "Cancelling…" : "Cancel RSVP"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => router.back()}
          >
            Keep my spot
          </button>
        </div>
      </div>
    </main>
  );
}
