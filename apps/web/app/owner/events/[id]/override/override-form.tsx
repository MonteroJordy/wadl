"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ownerOverrideAdmitAction } from "./actions";
import { useToast } from "@/components/toast";

interface NightOpt {
  id: string;
  label: string;
  is_frozen: boolean;
}

const TIERS = ["ga", "vip", "all_access"] as const;
type TierVal = (typeof TIERS)[number];

export default function OverrideForm({
  eventId,
  nights,
}: {
  eventId: string;
  nights: NightOpt[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [nightId, setNightId] = useState(nights[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<TierVal>("ga");
  const [plus, setPlus] = useState("0");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a name.");
    if (!reason.trim())
      return toast.error("Reason required for the audit log.");
    startTransition(async () => {
      const res = await ownerOverrideAdmitAction({
        eventId,
        nightId,
        fullName: name,
        phone: phone.trim() || null,
        tier,
        plusOnes: parseInt(plus, 10) || 0,
        reason,
      });
      if (res.ok) {
        toast.success("Admitted. Audit row written.");
        router.replace(`/owner/events/${eventId}/guests/${res.guestId}`);
      } else toast.error(res.error);
    });
  }

  const currentNight = nights.find((n) => n.id === nightId);

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-5)",
      }}
    >
      {currentNight?.is_frozen && (
        <div
          className="card"
          style={{ padding: "var(--s-4)", borderColor: "var(--err)" }}
        >
          <div
            className="t-meta"
            style={{ color: "var(--err)", marginBottom: "var(--s-1)" }}
          >
            ⚠ Lockdown active
          </div>
          <div className="t-body-2" style={{ color: "var(--fg)" }}>
            This night is at capacity threshold. The override will admit them
            anyway and the audit log records the bypass.
          </div>
        </div>
      )}

      <div>
        <label htmlFor="ov-night" className="t-meta">
          Night
        </label>
        <select
          id="ov-night"
          value={nightId}
          onChange={(e) => setNightId(e.target.value)}
          className="input"
          style={{ marginTop: "var(--s-2)" }}
        >
          {nights.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
              {n.is_frozen ? " · LOCKED" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ov-name" className="t-meta">
          Full name
        </label>
        <input
          id="ov-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          style={{ marginTop: "var(--s-2)" }}
          required
        />
      </div>

      <div>
        <label htmlFor="ov-phone" className="t-meta">
          Phone (optional)
        </label>
        <input
          id="ov-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
          style={{ marginTop: "var(--s-2)" }}
          placeholder="(305) 555 1234"
        />
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
          {TIERS.map((t) => {
            const active = tier === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                style={{
                  padding: "var(--s-3)",
                  border: `1px solid ${
                    active ? "var(--fg)" : "var(--line-2)"
                  }`,
                  borderRadius: "var(--r-md)",
                  background: active ? "var(--bg-3)" : "transparent",
                  color: active ? "var(--fg)" : "var(--fg-3)",
                  fontFamily: "var(--mono)",
                  fontSize: "var(--ts-sm)",
                  cursor: "pointer",
                }}
              >
                {t === "all_access" ? "AA" : t.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="ov-plus" className="t-meta">
          +1s
        </label>
        <input
          id="ov-plus"
          type="number"
          min={0}
          max={10}
          value={plus}
          onChange={(e) => setPlus(e.target.value.replace(/[^\d]/g, ""))}
          className="input"
          style={{ marginTop: "var(--s-2)" }}
        />
      </div>

      <div>
        <label htmlFor="ov-reason" className="t-meta">
          Reason (required for audit)
        </label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--s-1)",
            marginTop: "var(--s-2)",
            marginBottom: "var(--s-2)",
          }}
        >
          {[
            "VIP arrival",
            "Staff comp",
            "Capacity bump",
            "Headliner +1",
            "Press / media",
            "Door fix",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() =>
                setReason((cur) => (cur.trim() === preset ? "" : preset))
              }
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                className={`chip ${
                  reason.trim() === preset ? "chip--solid" : "chip--ghost"
                }`}
              >
                {preset}
              </span>
            </button>
          ))}
        </div>
        <textarea
          id="ov-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          style={{ minHeight: 72 }}
          placeholder="VIP guest of the headliner — venue OK"
          required
        />
      </div>

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Admitting…" : "Override + admit"}
      </button>

      <div className="t-meta">
        This bypasses capacity caps + frozen lists. Every override is logged.
      </div>
    </form>
  );
}
