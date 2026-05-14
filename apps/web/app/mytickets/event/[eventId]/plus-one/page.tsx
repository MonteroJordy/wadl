"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function AddPlusOnePage() {
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);

  function onAdd() {
    if (!first.trim()) return;
    setPending(true);
    setTimeout(() => {
      router.push("/mytickets");
    }, 600);
  }

  const valid = first.trim().length > 0;

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
            Cancel
          </button>
          <span className="t-meta">Add +1</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={!valid || pending}
            className="t-meta"
            style={{
              background: "transparent",
              border: 0,
              color: valid && !pending ? "var(--fg)" : "var(--fg-4)",
              fontWeight: 600,
              cursor: valid && !pending ? "pointer" : "not-allowed",
              padding: 0,
            }}
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>

        <div style={{ padding: "var(--s-5)" }}>
          <div className="t-display-sm">Who&apos;s coming with you?</div>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)" }}
          >
            They&apos;ll get their own credential. Phone optional but speeds up
            door check-in.
          </p>
        </div>

        <div
          style={{
            padding: "var(--s-2) var(--s-5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-4)",
          }}
        >
          <div>
            <label
              htmlFor="first"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              First name
            </label>
            <input
              id="first"
              type="text"
              autoComplete="given-name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="input"
              autoFocus
              required
            />
          </div>
          <div>
            <label
              htmlFor="last"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Last name
            </label>
            <input
              id="last"
              type="text"
              autoComplete="family-name"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+1 ···"
            />
          </div>
        </div>

        <div style={{ padding: "var(--s-6) var(--s-5) var(--s-2)" }}>
          <span className="t-meta">Plus-ones so far</span>
        </div>
        <div className="card" style={{ margin: "0 var(--s-5)" }}>
          <div style={{ padding: "var(--s-4)" }}>
            <p className="t-body-2">Empty · 0 of 1 used</p>
          </div>
        </div>
      </div>
    </main>
  );
}
