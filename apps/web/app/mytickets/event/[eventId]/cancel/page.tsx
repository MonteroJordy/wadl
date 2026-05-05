"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  IconBack,
  WFrame,
} from "@/components/wadl";

const REASONS = [
  "Plans changed",
  "Found a conflict",
  "Not feeling it",
  "Sick",
  "Other",
];

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
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 0",
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--w-fg)",
              cursor: "pointer",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBack />
          </button>
          <span className="w-type-meta">CANCEL RSVP</span>
          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: "24px 20px 0" }}>
          <div className="w-type-meta">YOU&apos;RE CANCELLING</div>
          <div
            className="w-type-h1"
            style={{ marginTop: 6 }}
          >
            Your spot
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 4,
            }}
          >
            We&apos;ll release your hold and let the host know.
          </p>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          <div
            className="w-card"
            style={{
              padding: 16,
              background: "oklch(0.86 0.18 145 / 0.08)",
              borderColor: "oklch(0.86 0.18 145 / 0.3)",
            }}
          >
            <Chip tone="ok">FREE CANCELLATION WINDOW</Chip>
            <p
              className="w-type-body"
              style={{ marginTop: 8 }}
            >
              You&apos;re ahead of the cutoff. No reputation hit, any hold is
              released in full.
            </p>
          </div>
        </div>

        <div style={{ padding: "24px 20px 0" }}>
          <div className="w-type-meta">REASON (OPTIONAL)</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 12,
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
                    gap: 12,
                    padding: "14px 16px",
                    border: "1px solid",
                    borderColor: active
                      ? "var(--w-acc)"
                      : "var(--w-line)",
                    background: active
                      ? "var(--w-acc-soft)"
                      : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={active}
                    onChange={() => setReason(r)}
                    style={{ accentColor: "var(--w-acc)" }}
                  />
                  <span style={{ fontSize: 15 }}>{r}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: 20,
            background:
              "linear-gradient(to top, var(--w-bg) 60%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: "auto",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="w-btn w-btn--block"
            style={{
              background: "var(--w-err)",
              color: "#fff",
              opacity: pending ? 0.5 : 1,
            }}
          >
            {pending ? "Cancelling…" : "Cancel RSVP"}
          </button>
          <Button
            variant="ghost"
            block
            onClick={() => router.back()}
          >
            Keep my spot
          </Button>
        </div>
      </WFrame>
    </main>
  );
}
