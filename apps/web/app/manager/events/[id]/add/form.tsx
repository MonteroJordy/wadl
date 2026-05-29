"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { managerAddGuestAction } from "./actions";

type Tier = "ga" | "vip" | "all_access";

interface AllocationOption {
  id: string;
  holder_name: string;
  cap: number;
  used: number;
}

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  marginBottom: "var(--s-2)",
};

export default function ManagerAddForm({
  eventId,
  eventName,
  nightId,
  allocations,
  backHref,
}: {
  eventId: string;
  eventName: string;
  nightId: string;
  allocations: AllocationOption[];
  backHref: string;
}) {
  const defaultAllocId =
    allocations.find((a) => a.used < a.cap)?.id ?? allocations[0]?.id ?? "";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [allocationId, setAllocationId] = useState(defaultAllocId);
  const [tier, setTier] = useState<Tier>("ga");
  const [plusOnes, setPlusOnes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Enter a name.");
    if (!allocationId) return setError("Pick an allocation.");

    const fd = new FormData();
    fd.set("night_id", nightId);
    fd.set("full_name", fullName.trim());
    fd.set("phone", phone.trim());
    fd.set("allocation_id", allocationId);
    fd.set("tier", tier);
    fd.set("plus_ones", String(plusOnes));

    startTransition(async () => {
      const res = await managerAddGuestAction(eventId, fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-6) var(--s-24)",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--s-4)",
          }}
        >
          <Link
            href={backHref}
            className="t-meta"
            style={{ textDecoration: "none" }}
          >
            ← Back
          </Link>
          <div className="t-meta">Add at door</div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--line)",
            paddingBottom: "var(--s-6)",
            marginBottom: "var(--s-6)",
          }}
        >
          <div className="t-display-md">{eventName}</div>
          <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
            Walk-up manual add. Auto-checks in.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-5)",
          }}
        >
          <div>
            <label htmlFor="fullName" className="t-meta" style={LABEL_STYLE}>
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="t-meta" style={LABEL_STYLE}>
              Phone (optional)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="(305) 555 1234"
            />
          </div>

          <div>
            <label htmlFor="allocation" className="t-meta" style={LABEL_STYLE}>
              Charge to
            </label>
            <select
              id="allocation"
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              className="input"
              required
            >
              {allocations.length === 0 && (
                <option value="">No allocations yet</option>
              )}
              {allocations.map((a) => (
                <option key={a.id} value={a.id} disabled={a.used >= a.cap}>
                  {a.holder_name} · {a.used}/{a.cap}
                  {a.used >= a.cap ? " (full)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
              Tier
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--s-2)",
              }}
            >
              {(["ga", "vip", "all_access"] as const).map((t) => {
                const active = tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={active ? "btn btn--sm" : "btn btn--ghost btn--sm"}
                  >
                    {t.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="plusOnes" className="t-meta" style={LABEL_STYLE}>
              +1s
            </label>
            <select
              id="plusOnes"
              value={plusOnes}
              onChange={(e) => setPlusOnes(parseInt(e.target.value, 10))}
              className="input"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Just them" : `+${n}`}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="t-body-2" style={{ color: "var(--err)" }}>
              {error}
            </p>
          )}

          <button
            className="btn btn--lg btn--accent btn--block"
            type="submit"
            disabled={pending || allocations.length === 0}
          >
            {pending ? "Adding…" : "Add & check in"}
          </button>
        </form>
      </div>
    </main>
  );
}
