"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAllocationAction } from "./actions";
import { fmtDate } from "@/lib/format";

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
  const [cap, setCap] = useState("20");
  const [autoApprove, setAutoApprove] = useState(false);
  const [plusOnes, setPlusOnes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nightId) return setError("Pick a night.");
    if (!holderName.trim()) return setError("Holder name required.");

    const fd = new FormData();
    fd.set("night_id", nightId);
    fd.set("holder_name", holderName.trim());
    fd.set("holder_phone", holderPhone.trim());
    fd.set("holder_email", holderEmail.trim());
    fd.set("cap", cap);
    if (autoApprove) fd.set("auto_approve", "on");
    if (plusOnes) fd.set("plus_ones_allowed", "on");

    startTransition(async () => {
      const res = await createAllocationAction(eventId, fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={`/owner/events/${eventId}/allocations`} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono">New allocation</p>
      </header>

      <h1 className="display-lg mb-1">{eventName}</h1>
      <p className="label-mono mb-6">Hand a holder the keys.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {nights.length > 1 && (
          <div>
            <label htmlFor="night" className="label-mono block mb-2">Night</label>
            <select
              id="night"
              value={nightId}
              onChange={(e) => setNightId(e.target.value)}
              className="input-dark"
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
          <label htmlFor="holderName" className="label-mono block mb-2">Holder name</label>
          <input
            id="holderName"
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="input-dark"
            placeholder="Diplo / Kiko / Mainframe Promo"
            required
          />
        </div>

        <div>
          <label htmlFor="holderPhone" className="label-mono block mb-2">Phone (for magic-link SMS, optional)</label>
          <input
            id="holderPhone"
            type="tel"
            value={holderPhone}
            onChange={(e) => setHolderPhone(e.target.value)}
            className="input-dark"
            placeholder="(305) 555 1234"
          />
        </div>

        <div>
          <label htmlFor="holderEmail" className="label-mono block mb-2">Email (optional)</label>
          <input
            id="holderEmail"
            type="email"
            value={holderEmail}
            onChange={(e) => setHolderEmail(e.target.value)}
            className="input-dark"
            placeholder="holder@label.com"
          />
        </div>

        <div>
          <label htmlFor="cap" className="label-mono block mb-2">Cap (people, +1s count)</label>
          <input
            id="cap"
            type="number"
            min={1}
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="input-dark"
            required
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-5 h-5 accent-coral"
            />
            <span>
              <span className="font-sans text-cream text-sm font-semibold">Auto-approve</span>
              <span className="label-mono block">Skip the queue for this holder.</span>
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={plusOnes}
              onChange={(e) => setPlusOnes(e.target.checked)}
              className="w-5 h-5 accent-coral"
            />
            <span>
              <span className="font-sans text-cream text-sm font-semibold">Allow +1s</span>
              <span className="label-mono block">Holder can add a plus-one count per name.</span>
            </span>
          </label>
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create allocation"}
        </button>
      </form>
    </main>
  );
}
