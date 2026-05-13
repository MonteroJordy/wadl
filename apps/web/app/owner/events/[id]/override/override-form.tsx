"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@/components/wadl";
import { ownerOverrideAdmitAction } from "./actions";
import { useToast } from "@/components/toast";

interface NightOpt {
  id: string;
  label: string;
  is_frozen: boolean;
}

const TIERS = ["ga", "vip", "all_access"] as const;
type TierVal = (typeof TIERS)[number];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
    if (!reason.trim()) return toast.error("Reason required for the audit log.");
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
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {currentNight?.is_frozen && (
        <div
          className="w-card"
          style={{ padding: 16, borderColor: "var(--w-err)" }}
        >
          <div
            className="w-type-meta"
            style={{ color: "var(--w-err)", marginBottom: 4 }}
          >
            ⚠ LOCKDOWN ACTIVE
          </div>
          <p
            style={{
              color: "var(--w-fg)",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            This night is at capacity threshold. The override will admit them
            anyway and the audit log records the bypass.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="ov-night"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          NIGHT
        </label>
        <select
          id="ov-night"
          value={nightId}
          onChange={(e) => setNightId(e.target.value)}
          style={INPUT_STYLE}
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
        <label
          htmlFor="ov-name"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          FULL NAME
        </label>
        <input
          id="ov-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={INPUT_STYLE}
          required
        />
      </div>

      <div>
        <label
          htmlFor="ov-phone"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          PHONE (OPTIONAL)
        </label>
        <input
          id="ov-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={INPUT_STYLE}
          placeholder="(305) 555 1234"
        />
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
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              style={{
                padding: 12,
                border: `1px solid ${tier === t ? "var(--w-acc)" : "var(--w-line)"}`,
                background:
                  tier === t ? "var(--w-acc-soft)" : "var(--w-surface-1)",
                color:
                  tier === t ? "var(--w-acc-ink)" : "var(--w-fg-muted)",
                fontFamily: "var(--w-mono)",
                fontSize: 12,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {t === "all_access" ? "AA" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="ov-plus"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          +1S
        </label>
        <input
          id="ov-plus"
          type="number"
          min={0}
          max={10}
          value={plus}
          onChange={(e) => setPlus(e.target.value.replace(/[^\d]/g, ""))}
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label
          htmlFor="ov-reason"
          className="w-type-meta"
          style={{ display: "block", marginBottom: 6 }}
        >
          REASON (REQUIRED FOR AUDIT)
        </label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
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
              <Chip tone={reason.trim() === preset ? "acc" : "ghost"}>
                {preset.toUpperCase()}
              </Chip>
            </button>
          ))}
        </div>
        <textarea
          id="ov-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ ...INPUT_STYLE, minHeight: 72 }}
          placeholder="VIP guest of the headliner — venue OK"
          required
        />
      </div>

      <Button variant="primary" type="submit" disabled={pending}>
        {pending ? "Admitting…" : "Override + admit"}
      </Button>

      <div className="w-type-meta">
        THIS BYPASSES CAPACITY CAPS + FROZEN LISTS. EVERY OVERRIDE IS LOGGED.
      </div>
    </form>
  );
}
