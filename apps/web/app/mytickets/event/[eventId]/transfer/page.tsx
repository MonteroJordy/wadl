"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Chip,
  IconBack,
  WFrame,
} from "@/components/wadl";

// Stub recents — real recents come from a contacts table not yet wired.
const RECENTS = [
  { name: "Mansur K", handle: "@mansur" },
  { name: "Devin Wu", handle: "@devin" },
  { name: "Ana Cruz", handle: "@ana" },
];

export default function TransferSpotPage() {
  const router = useRouter();
  const [recipient, setRecipient] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onTransfer() {
    setPending(true);
    setTimeout(() => {
      router.push("/mytickets");
    }, 600);
  }

  const target =
    selected ?? (recipient.trim() ? recipient.trim() : null);

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
          <span className="w-type-meta">TRANSFER SPOT</span>
          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: "20px" }}>
          <div
            style={{
              fontFamily: "var(--w-display)",
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            Send your RSVP to a friend
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 6,
            }}
          >
            They get the credential. You don&apos;t. One transfer per event.
          </p>
        </div>

        <div style={{ padding: "0 20px" }}>
          <span className="w-label">SEND TO</span>
          <input
            className="w-input"
            placeholder="Phone or @handle"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setSelected(null);
            }}
          />
        </div>

        <div style={{ padding: "24px 20px 8px" }}>
          <span className="w-type-meta">RECENT</span>
        </div>
        <div className="w-card" style={{ margin: "0 20px" }}>
          {RECENTS.map((r) => {
            const isSelected = selected === r.name;
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => {
                  setSelected(r.name);
                  setRecipient("");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderTop: "1px solid var(--w-line)",
                  background: isSelected
                    ? "var(--w-acc-soft)"
                    : "transparent",
                  border: 0,
                  borderTopWidth: 1,
                  borderTopStyle: "solid",
                  borderTopColor: "var(--w-line)",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <Avatar name={r.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15 }}>{r.name}</div>
                  <div className="w-type-meta" style={{ marginTop: 1 }}>
                    {r.handle}
                  </div>
                </div>
                {isSelected ? <Chip tone="acc">SELECTED</Chip> : null}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "20px" }}>
          <div
            className="w-card"
            style={{
              padding: 14,
              background: "oklch(0.86 0.16 85 / 0.08)",
              borderColor: "oklch(0.86 0.16 85 / 0.3)",
            }}
          >
            <Chip tone="warn">HEADS UP</Chip>
            <p
              className="w-type-body-sm"
              style={{ marginTop: 6 }}
            >
              They get your credential. Any hold stays until they scan in. One
              transfer per event.
            </p>
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: 20,
            background:
              "linear-gradient(to top, var(--w-bg) 60%, transparent)",
            marginTop: "auto",
          }}
        >
          <Button
            variant="primary"
            block
            disabled={!target || pending}
            onClick={onTransfer}
          >
            {pending
              ? "Transferring…"
              : target
                ? `Transfer to ${target}`
                : "Pick a recipient"}
          </Button>
        </div>
      </WFrame>
    </main>
  );
}
