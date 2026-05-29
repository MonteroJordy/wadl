"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addWalkInAction,
  changeTierAction,
  markNoShowAction,
} from "./actions";

type Tier = "ga" | "vip" | "aaa";
type GuestStatus = "pending" | "approved" | "declined" | "no_show";

interface GuestRow {
  id: string;
  full_name: string;
  phone: string | null;
  tier: Tier;
  status: GuestStatus;
  checked_in: boolean;
}

const TIER_LABEL: Record<Tier, string> = {
  ga: "GA",
  vip: "VIP",
  aaa: "AAA",
};

const STATUS_CHIP: Record<GuestStatus, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "" },
  approved: { label: "Approved", tone: "chip--ok" },
  declined: { label: "Declined", tone: "chip--err" },
  no_show: { label: "No-show", tone: "chip--warn" },
};

export default function DoorManagerClient({
  eventId,
  nightId,
  guests,
}: {
  eventId: string;
  nightId: string;
  guests: GuestRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("ga");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "no_show">("all");

  function refresh() {
    router.refresh();
  }

  function onAddWalkIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name required.");
    startTransition(async () => {
      const res = await addWalkInAction({
        eventId,
        nightId,
        name,
        phone: phone || null,
        tier,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setPhone("");
      setTier("ga");
      refresh();
    });
  }

  function onNoShow(guestId: string) {
    startTransition(async () => {
      const res = await markNoShowAction(eventId, guestId);
      if (!res.ok) setError(res.error);
      else refresh();
    });
  }

  function onChangeTier(guestId: string, t: Tier) {
    startTransition(async () => {
      const res = await changeTierAction(eventId, guestId, t);
      if (!res.ok) setError(res.error);
      else refresh();
    });
  }

  const visible = guests.filter((g) => {
    if (filter === "pending") return g.status === "pending";
    if (filter === "no_show") return g.status === "no_show";
    return true;
  });

  return (
    <div
      style={{
        padding: "var(--s-8)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: "var(--s-6)",
        alignItems: "start",
      }}
    >
      {/* Guest list */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-3)",
            marginBottom: "var(--s-3)",
          }}
        >
          <div className="t-meta" style={{ flex: 1 }}>
            ON THE LIST · {visible.length}
          </div>
          <div style={{ display: "flex", gap: "var(--s-1)" }}>
            {(["all", "pending", "no_show"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={"chip " + (filter === f ? "" : "chip--ghost")}
                style={{ cursor: "pointer", border: 0 }}
              >
                {f === "no_show" ? "No-shows" : f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-8)",
              textAlign: "center",
              color: "var(--fg-3)",
            }}
          >
            <span className="t-body-2">No guests match this filter.</span>
          </div>
        ) : (
          <div className="card">
            {visible.map((g, i) => {
              const chip = STATUS_CHIP[g.status];
              return (
                <div
                  key={g.id}
                  className="row"
                  style={{
                    gridTemplateColumns: "1fr 120px 90px 90px",
                    borderBottom:
                      i === visible.length - 1 ? "0" : "1px solid var(--line)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="t-h2 truncate">{g.full_name}</div>
                    <div
                      className="t-meta"
                      style={{ color: "var(--fg-3)", marginTop: 2 }}
                    >
                      {g.phone ?? "no phone"}
                    </div>
                  </div>
                  <select
                    value={g.tier}
                    onChange={(e) =>
                      onChangeTier(g.id, e.target.value as Tier)
                    }
                    disabled={pending}
                    className="input"
                    style={{
                      height: 32,
                      padding: "0 var(--s-3)",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                      <option key={t} value={t}>
                        {TIER_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <span className={"chip " + chip.tone} style={{ justifySelf: "start" }}>
                    {chip.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNoShow(g.id)}
                    disabled={pending || g.status === "no_show"}
                    className="t-meta"
                    style={{
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      color: g.status === "no_show" ? "var(--fg-4)" : "var(--err)",
                      padding: 0,
                      justifySelf: "end",
                    }}
                  >
                    NO-SHOW
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add walk-in panel */}
      <aside style={{ position: "sticky", top: "var(--s-6)" }}>
        <form
          onSubmit={onAddWalkIn}
          className="card"
          style={{
            padding: "var(--s-5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          <div className="t-meta">ADD WALK-IN</div>
          <div>
            <label htmlFor="wi-name" className="t-meta" style={{ display: "block", marginBottom: 4 }}>
              Name
            </label>
            <input
              id="wi-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="wi-phone" className="t-meta" style={{ display: "block", marginBottom: 4 }}>
              Phone (optional)
            </label>
            <input
              id="wi-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
              inputMode="tel"
              className="input"
            />
          </div>
          <div>
            <span className="t-meta">Tier</span>
            <div style={{ display: "flex", gap: "var(--s-2)", marginTop: 4 }}>
              {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={"btn btn--sm " + (tier === t ? "" : "btn--ghost")}
                  style={{ flex: 1 }}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="t-body-2" style={{ color: "var(--err)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn--accent btn--block"
            disabled={pending}
          >
            {pending ? "Adding…" : "+ Add walk-in"}
          </button>
        </form>
      </aside>
    </div>
  );
}
