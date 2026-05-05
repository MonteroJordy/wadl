"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WFrame } from "@/components/wadl";

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
            className="w-type-meta"
            style={{
              background: "transparent",
              border: 0,
              color: "var(--w-fg-muted)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            CANCEL
          </button>
          <span className="w-type-meta">ADD +1</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={!valid || pending}
            className="w-type-meta"
            style={{
              background: "transparent",
              border: 0,
              color: valid && !pending ? "var(--w-acc)" : "var(--w-fg-dim)",
              fontWeight: 600,
              cursor: valid && !pending ? "pointer" : "not-allowed",
              padding: 0,
            }}
          >
            {pending ? "ADDING…" : "ADD"}
          </button>
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
            Who&apos;s coming with you?
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 6,
            }}
          >
            They&apos;ll get their own credential. Phone optional but speeds up
            door check-in.
          </p>
        </div>

        <div
          style={{
            padding: "8px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <label htmlFor="first" className="w-label">
              FIRST NAME
            </label>
            <input
              id="first"
              type="text"
              autoComplete="given-name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="w-input"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="last" className="w-label">
              LAST NAME
            </label>
            <input
              id="last"
              type="text"
              autoComplete="family-name"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              className="w-input"
            />
          </div>
          <div>
            <label htmlFor="phone" className="w-label">
              PHONE (OPTIONAL)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-input"
              placeholder="+1 ···"
            />
          </div>
        </div>

        <div style={{ padding: "24px 20px 8px" }}>
          <span className="w-type-meta">PLUS-ONES SO FAR</span>
        </div>
        <div className="w-card" style={{ margin: "0 20px" }}>
          <div style={{ padding: "14px 16px" }}>
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              Empty · 0 of 1 used
            </p>
          </div>
        </div>
      </WFrame>
    </main>
  );
}
