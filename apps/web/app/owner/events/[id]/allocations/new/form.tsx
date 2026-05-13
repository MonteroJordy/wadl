"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAllocationAction } from "./actions";
import { fmtDate } from "@/lib/format";
import {
  Button,
  Chip,
  CredPill,
  WFrame,
  Wordmark,
} from "@/components/wadl";
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
    <main id="main-content">
      <WFrame wide maxWidth={760} style={{ paddingBottom: 48 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 0",
          }}
        >
          <Link
            href={`/owner/events/${eventId}/allocations`}
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <Wordmark variant="monogrid" size={16} />
          <span className="w-type-meta">NEW ALLOCATION</span>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">{eventName.toUpperCase()}</div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            Hand a holder
            <br />
            the keys.
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          style={{
            padding: "32px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {nights.length > 1 && (
            <div>
              <label htmlFor="night" className="w-label">
                NIGHT
              </label>
              <select
                id="night"
                value={nightId}
                onChange={(e) => setNightId(e.target.value)}
                className="w-input"
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
            <label htmlFor="holderName" className="w-label">
              HOLDER NAME
            </label>
            <input
              id="holderName"
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="w-input"
              placeholder="Diplo / Kiko / Mainframe Promo"
              required
              autoFocus
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label htmlFor="holderPhone" className="w-label">
                PHONE (FOR MAGIC-LINK SMS)
              </label>
              <input
                id="holderPhone"
                type="tel"
                value={holderPhone}
                onChange={(e) => setHolderPhone(e.target.value)}
                className="w-input"
                placeholder="+1 ···"
              />
            </div>
            <div>
              <label htmlFor="holderEmail" className="w-label">
                EMAIL (OPTIONAL)
              </label>
              <input
                id="holderEmail"
                type="email"
                value={holderEmail}
                onChange={(e) => setHolderEmail(e.target.value)}
                className="w-input"
                placeholder="holder@label.com"
              />
            </div>
          </div>

          {/* Per-tier caps — Day 50 wedge feature */}
          <div>
            <label className="w-label">
              CAPS PER TIER · TOTAL {total}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <TierCapInput
                tier="GA"
                value={gaCap}
                onChange={setGaCap}
              />
              <TierCapInput
                tier="VIP"
                value={vipCap}
                onChange={setVipCap}
              />
              <TierCapInput
                tier="AAA"
                value={aaaCap}
                onChange={setAaaCap}
              />
            </div>
            <p className="w-type-meta" style={{ marginTop: 8 }}>
              EACH TIER GETS ITS OWN SHARE LINK · HOLDER COPIES 3 URLS
            </p>
          </div>

          {/* Toggles */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 4,
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
              className="w-type-body-sm"
              style={{ color: "var(--w-err)" }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={pending || total < 1}
          >
            {pending ? "Creating…" : `Create allocation · ${total} total`}
          </Button>
        </form>
      </WFrame>
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <CredPill tier={tier} />
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-input"
        style={{ height: 48 }}
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
        gap: 12,
        padding: 14,
        border: "1px solid",
        borderColor: checked ? "var(--w-acc)" : "var(--w-line)",
        background: checked ? "var(--w-acc-soft)" : "transparent",
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
          accentColor: "var(--w-acc)",
        }}
      />
      <span style={{ flex: 1 }}>
        <span
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {label}
        </span>
        <span
          className="w-type-meta"
          style={{ marginTop: 4, display: "block" }}
        >
          {hint.toUpperCase()}
        </span>
      </span>
      {checked ? <Chip tone="acc">ON</Chip> : null}
    </label>
  );
}
