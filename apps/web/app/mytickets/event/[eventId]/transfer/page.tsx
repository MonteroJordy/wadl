"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Stub recents — real recents come from a contacts table not yet wired.
const RECENTS = [
  { name: "Mansur K", handle: "@mansur" },
  { name: "Devin Wu", handle: "@devin" },
  { name: "Ana Cruz", handle: "@ana" },
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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
          <span className="t-meta">Transfer spot</span>
          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: "var(--s-5)" }}>
          <div className="t-display-sm">Send your RSVP to a friend</div>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)" }}
          >
            They get the credential. You don&apos;t. One transfer per event.
          </p>
        </div>

        <div style={{ padding: "0 var(--s-5)" }}>
          <label
            className="t-meta"
            style={{ display: "block", marginBottom: "var(--s-2)" }}
          >
            Send to
          </label>
          <input
            className="input"
            placeholder="Phone or @handle"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setSelected(null);
            }}
          />
        </div>

        <div style={{ padding: "var(--s-6) var(--s-5) var(--s-2)" }}>
          <span className="t-meta">Recent</span>
        </div>
        <div className="card" style={{ margin: "0 var(--s-5)" }}>
          {RECENTS.map((r, i) => {
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
                  gap: "var(--s-3)",
                  padding: "var(--s-4)",
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--line)",
                  background: isSelected ? "var(--bg-3)" : "transparent",
                  border: 0,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopStyle: "solid",
                  borderTopColor: "var(--line)",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--r-pill)",
                    background: "var(--bg-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {initials(r.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-body">{r.name}</div>
                  <div
                    className="t-meta"
                    style={{ marginTop: 1 }}
                  >
                    {r.handle}
                  </div>
                </div>
                {isSelected ? (
                  <span className="chip chip--solid">Selected</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "var(--s-5)" }}>
          <div
            className="card"
            style={{
              padding: "var(--s-4)",
              borderColor: "var(--warn)",
            }}
          >
            <span className="chip chip--warn">Heads up</span>
            <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              They get your credential. Any hold stays until they scan in. One
              transfer per event.
            </p>
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: "var(--s-5)",
            background:
              "linear-gradient(to top, var(--bg) 60%, transparent)",
            marginTop: "auto",
          }}
        >
          <button
            type="button"
            className="btn btn--block"
            disabled={!target || pending}
            onClick={onTransfer}
          >
            {pending
              ? "Transferring…"
              : target
                ? `Transfer to ${target}`
                : "Pick a recipient"}
          </button>
        </div>
      </div>
    </main>
  );
}
