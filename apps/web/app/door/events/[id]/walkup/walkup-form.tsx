"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addWalkInAction } from "./actions";

const TIERS = ["GA", "VIP", "AAA"] as const;
type Tier = (typeof TIERS)[number];

interface CoverOption {
  id: "cash" | "card" | "comp";
  label: string;
  muted?: boolean;
}
const COVER: readonly CoverOption[] = [
  { id: "cash", label: "Cash $20" },
  { id: "card", label: "Card" },
  { id: "comp", label: "Comp", muted: true },
];

export default function WalkUpForm({
  eventId,
  eventName,
  nightId,
  capacity,
  checkedIn,
  backHref,
}: {
  eventId: string;
  eventName: string;
  nightId: string;
  capacity: number;
  checkedIn: number;
  backHref: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("GA");
  const [cover, setCover] = useState<CoverOption["id"]>("cash");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nearCap = capacity > 0 && checkedIn >= capacity - 10;

  function onAdd() {
    if (!name.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await addWalkInAction(eventId, {
        name,
        phone,
        tier,
        cover,
        nightId,
      });
      if (res.ok) {
        router.push(backHref);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <main
      id="main-content"
      className="v5"
      style={{ background: "var(--bg)", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div
          style={{
            padding: "var(--s-6) var(--s-8)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--s-4)",
          }}
        >
          <div>
            <Link
              href={backHref}
              className="t-meta"
              style={{
                color: "var(--fg-3)",
                textDecoration: "none",
                display: "inline-block",
                marginBottom: "var(--s-2)",
              }}
            >
              ← Back
            </Link>
            <div className="t-meta">Door · walk-up</div>
            <div
              className="t-display-md"
              style={{ marginTop: "var(--s-2)" }}
            >
              {eventName}
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div
          style={{
            padding: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-5)",
          }}
        >
          <div>
            <label
              htmlFor="walk-name"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Name
            </label>
            <input
              id="walk-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="First Last"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="walk-phone"
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Phone (optional)
            </label>
            <input
              id="walk-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+1 ···"
            />
          </div>

          <div>
            <span
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Tier
            </span>
            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={
                    "btn btn--block" + (tier === t ? "" : " btn--ghost")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span
              className="t-meta"
              style={{ display: "block", marginBottom: "var(--s-2)" }}
            >
              Cover collected?
            </span>
            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              {COVER.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCover(c.id)}
                  className={
                    "btn btn--block" +
                    (cover === c.id ? "" : " btn--ghost")
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {nearCap && (
            <div className="card" style={{ padding: "var(--s-5)" }}>
              <span className="chip chip--warn">Cap check</span>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-2)" }}
              >
                {checkedIn} of {capacity} checked in. Walk-in eats the
                buffer.
              </p>
            </div>
          )}

          {error && (
            <div
              className="t-body-2"
              style={{ color: "var(--err)" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* ── Sticky submit ── */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: "var(--s-8)",
            background:
              "linear-gradient(to top, var(--bg) 60%, transparent)",
          }}
        >
          <button
            type="button"
            className="btn btn--xl btn--block"
            disabled={!name.trim() || pending}
            onClick={onAdd}
          >
            {pending ? "Adding…" : "Add + check in"}
          </button>
        </div>
      </div>
    </main>
  );
}
