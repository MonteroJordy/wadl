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
    <form onSubmit={submit} className="flex flex-col gap-4">
      {currentNight?.is_frozen && (
        <div className="card border-coral">
          <p className="label-mono text-coral mb-1">⚠ Lockdown active</p>
          <p className="text-cream text-sm">
            This night is at capacity threshold. The override will admit them
            anyway and the audit log records the bypass.
          </p>
        </div>
      )}

      <div>
        <label className="label-mono block mb-2" htmlFor="ov-night">
          Night
        </label>
        <select
          id="ov-night"
          value={nightId}
          onChange={(e) => setNightId(e.target.value)}
          className="input-dark"
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
        <label className="label-mono block mb-2" htmlFor="ov-name">
          Full name
        </label>
        <input
          id="ov-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-dark"
          required
        />
      </div>

      <div>
        <label className="label-mono block mb-2" htmlFor="ov-phone">
          Phone (optional)
        </label>
        <input
          id="ov-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-dark"
          placeholder="(305) 555 1234"
        />
      </div>

      <div>
        <p className="label-mono mb-2">Tier</p>
        <div className="grid grid-cols-3 gap-2">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`p-3 rounded border ${
                tier === t
                  ? "border-coral bg-s2 text-cream"
                  : "border-line text-muted hover:text-cream"
              }`}
            >
              {t === "all_access" ? "AA" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label-mono block mb-2" htmlFor="ov-plus">
          +1s
        </label>
        <input
          id="ov-plus"
          type="number"
          min={0}
          max={10}
          value={plus}
          onChange={(e) => setPlus(e.target.value.replace(/[^\d]/g, ""))}
          className="input-dark"
        />
      </div>

      <div>
        <label className="label-mono block mb-2" htmlFor="ov-reason">
          Reason (required for audit)
        </label>
        <textarea
          id="ov-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input-dark min-h-[72px]"
          placeholder="VIP guest of the headliner — venue OK"
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Admitting…" : "Override + admit"}
      </button>

      <p className="label-mono">
        This bypasses capacity caps + frozen lists. Every override is logged.
      </p>
    </form>
  );
}
