"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
import { managerAddGuestAction } from "./actions";

type Tier = "ga" | "vip" | "all_access";

interface AllocationOption {
  id: string;
  holder_name: string;
  cap: number;
  used: number;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={backHref}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta" style={{ color: "var(--w-acc)" }}>
            ADD AT DOOR
          </div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">{eventName}</div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Walk-up manual add. Auto-checks in.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <div>
            <label
              htmlFor="fullName"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              FULL NAME
            </label>
            <input
              id="fullName"
              type="text"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={INPUT_STYLE}
              required
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              PHONE (OPTIONAL)
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={INPUT_STYLE}
              placeholder="(305) 555 1234"
            />
          </div>

          <div>
            <label
              htmlFor="allocation"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              CHARGE TO
            </label>
            <select
              id="allocation"
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              style={INPUT_STYLE}
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
            <div className="w-type-meta" style={{ marginBottom: 8 }}>
              TIER
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
              }}
            >
              {(["ga", "vip", "all_access"] as const).map((t) => {
                const active = tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    style={{
                      border: `1px solid ${active ? "var(--w-acc)" : "var(--w-line)"}`,
                      background: active
                        ? "var(--w-acc-soft)"
                        : "var(--w-surface-1)",
                      color: active
                        ? "var(--w-acc-ink)"
                        : "var(--w-fg-muted)",
                      padding: "12px 10px",
                      fontFamily: "var(--w-mono)",
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {t.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="plusOnes"
              className="w-type-meta"
              style={{ display: "block", marginBottom: 6 }}
            >
              +1S
            </label>
            <select
              id="plusOnes"
              value={plusOnes}
              onChange={(e) => setPlusOnes(parseInt(e.target.value, 10))}
              style={INPUT_STYLE}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Just them" : `+${n}`}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-err)" }}
            >
              {error}
            </p>
          )}

          <Button
            variant="primary"
            type="submit"
            disabled={pending || allocations.length === 0}
            style={{ width: "100%", padding: "16px 0" }}
          >
            {pending ? "Adding…" : "Add & check in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
