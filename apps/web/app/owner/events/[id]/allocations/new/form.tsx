"use client";

import { useState, useTransition } from "react";
import { createAllocationAction } from "./actions";
import { fmtDate } from "@/lib/format";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import { useFormSaveShortcut } from "@/components/use-form-save-shortcut";

interface NightOption {
  id: string;
  night_date: string;
  doors_at: string;
}

export default function NewAllocationForm({
  eventId,
  eventName,
  nights,
}: {
  eventId: string;
  eventName: string;
  nights: NightOption[];
}) {
  const [nightId, setNightId] = useState(nights[0]?.id ?? "");
  const [holderName, setHolderName] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  // Day 50: per-tier sub-caps. Total cap is now the sum of the three.
  const [gaCap, setGaCap] = useState("10");
  const [vipCap, setVipCap] = useState("10");
  const [aaaCap, setAaaCap] = useState("5");
  const [autoApprove, setAutoApprove] = useState(false);
  const [plusOnes, setPlusOnes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useFormSaveShortcut();

  const ga = parseInt(gaCap, 10) || 0;
  const vip = parseInt(vipCap, 10) || 0;
  const aaa = parseInt(aaaCap, 10) || 0;
  const total = ga + vip + aaa;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nightId) return setError("Pick a night.");
    if (!holderName.trim()) return setError("Holder name required.");
    if (total < 1) return setError("Total cap must be at least 1.");

    const fd = new FormData();
    fd.set("night_id", nightId);
    fd.set("holder_name", holderName.trim());
    fd.set("holder_phone", holderPhone.trim());
    fd.set("holder_email", holderEmail.trim());
    fd.set("cap", String(total));
    fd.set("ga_cap", String(ga));
    fd.set("vip_cap", String(vip));
    fd.set("aaa_cap", String(aaa));
    if (autoApprove) fd.set("auto_approve", "on");
    if (plusOnes) fd.set("plus_ones_allowed", "on");

    startTransition(async () => {
      const res = await createAllocationAction(eventId, fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [eventName, `/owner/events/${eventId}`],
          ["Allocations", `/owner/events/${eventId}/allocations`],
          "New",
        ]}
      />
      <PageHeader
        eyebrow="New allocation"
        title="Hand a holder the keys"
        sub="They add names up to their cap — every name gets attributed back."
      />
      <EventSubNav active="guests" eventId={eventId} />

      <form
        ref={formRef}
        onSubmit={onSubmit}
        style={{
          padding: "var(--s-8)",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        {nights.length > 1 && (
          <div>
            <label htmlFor="night" className="t-meta">
              Night
            </label>
            <select
              id="night"
              value={nightId}
              onChange={(e) => setNightId(e.target.value)}
              className="input"
              style={{ marginTop: "var(--s-2)" }}
            >
              {nights.map((n) => (
                <option key={n.id} value={n.id}>
                  {fmtDate(n.night_date)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="holderName" className="t-meta">
            Holder name
          </label>
          <input
            id="holderName"
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="input"
            style={{ marginTop: "var(--s-2)" }}
            placeholder="Diplo / Kiko / Mainframe Promo"
            required
            autoFocus
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-3)",
          }}
        >
          <div>
            <label htmlFor="holderPhone" className="t-meta">
              Phone (for magic-link SMS)
            </label>
            <input
              id="holderPhone"
              type="tel"
              value={holderPhone}
              onChange={(e) => setHolderPhone(e.target.value)}
              className="input"
              style={{ marginTop: "var(--s-2)" }}
              placeholder="+1 ···"
            />
          </div>
          <div>
            <label htmlFor="holderEmail" className="t-meta">
              Email (optional)
            </label>
            <input
              id="holderEmail"
              type="email"
              value={holderEmail}
              onChange={(e) => setHolderEmail(e.target.value)}
              className="input"
              style={{ marginTop: "var(--s-2)" }}
              placeholder="holder@label.com"
            />
          </div>
        </div>

        {/* Per-tier caps — Day 50 wedge feature */}
        <div>
          <div className="t-meta">Caps per tier · total {total}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "var(--s-2)",
              marginTop: "var(--s-2)",
            }}
          >
            <TierCapInput tier="GA" value={gaCap} onChange={setGaCap} />
            <TierCapInput tier="VIP" value={vipCap} onChange={setVipCap} />
            <TierCapInput tier="AAA" value={aaaCap} onChange={setAaaCap} />
          </div>
          <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
            Each tier gets its own share link · holder copies 3 URLs
          </div>
        </div>

        {/* Toggles */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
          }}
        >
          <ToggleRow
            label="Auto-approve"
            hint="Skip the queue for this holder."
            checked={autoApprove}
            onChange={setAutoApprove}
          />
          <ToggleRow
            label="Allow +1s"
            hint="Holder can add a +1 count per name."
            checked={plusOnes}
            onChange={setPlusOnes}
          />
        </div>

        {error ? (
          <p
            className="t-body-2"
            style={{ color: "var(--err)" }}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn--lg btn--accent btn--block"
          disabled={pending || total < 1}
        >
          {pending ? "Creating…" : `Create allocation · ${total} total`}
        </button>
      </form>
    </main>
  );
}

function TierCapInput({
  tier,
  value,
  onChange,
}: {
  tier: "GA" | "VIP" | "AAA";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: "var(--s-2)" }}>
        <span className="chip">{tier}</span>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        aria-label={`${tier} cap`}
      />
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--s-3)",
        padding: "var(--s-4)",
        border: "1px solid",
        borderColor: checked ? "var(--fg)" : "var(--line-2)",
        borderRadius: "var(--r-md)",
        background: checked ? "var(--bg-3)" : "transparent",
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          marginTop: 3,
          width: 16,
          height: 16,
          accentColor: "var(--fg)",
        }}
      />
      <span style={{ flex: 1 }}>
        <span
          className="t-body"
          style={{
            display: "block",
            fontWeight: 500,
            color: checked ? "var(--fg)" : "var(--fg-3)",
          }}
        >
          {label}
        </span>
        <span
          className="t-meta"
          style={{ marginTop: "var(--s-1)", display: "block" }}
        >
          {hint}
        </span>
      </span>
      {checked ? <span className="chip chip--solid">On</span> : null}
    </label>
  );
}
