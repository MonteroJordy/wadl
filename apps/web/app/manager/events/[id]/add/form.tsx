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
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={backHref} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className="label-mono text-gold">Add at door</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-1">{eventName}</h1>
      <p className="label-mono mb-6">Walk-up manual add. Auto-checks in.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="fullName" className="label-mono block mb-2">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-dark"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="label-mono block mb-2">
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-dark"
            placeholder="(305) 555 1234"
          />
        </div>

        <div>
          <label htmlFor="allocation" className="label-mono block mb-2">
            Charge to
          </label>
          <select
            id="allocation"
            value={allocationId}
            onChange={(e) => setAllocationId(e.target.value)}
            className="input-dark"
            required
          >
            {allocations.length === 0 && <option value="">No allocations yet</option>}
            {allocations.map((a) => (
              <option key={a.id} value={a.id} disabled={a.used >= a.cap}>
                {a.holder_name} · {a.used}/{a.cap}
                {a.used >= a.cap ? " (full)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="label-mono mb-2">Tier</p>
          <div className="grid grid-cols-3 gap-2">
            {(["ga", "vip", "all_access"] as const).map((t) => {
              const active = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`border rounded-md px-3 py-3 font-mono text-xs uppercase tracking-wider transition ${
                    active
                      ? "border-gold bg-s2 text-cream"
                      : "border-line bg-s1 text-muted hover:text-cream"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="plusOnes" className="label-mono block mb-2">
            +1s
          </label>
          <select
            id="plusOnes"
            value={plusOnes}
            onChange={(e) => setPlusOnes(parseInt(e.target.value, 10))}
            className="input-dark"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Just them" : `+${n}`}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-err text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-gold text-bg font-sans font-semibold text-sm uppercase tracking-[0.14em] py-4 rounded-md disabled:opacity-40 hover:brightness-110 transition"
          disabled={pending || allocations.length === 0}
        >
          {pending ? "Adding…" : "Add & check in"}
        </button>
      </form>
    </main>
  );
}
