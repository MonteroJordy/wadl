"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Chip,
  WFrame,
  Wordmark,
} from "@/components/wadl";

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

export default function DoorWalkUpPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("GA");
  const [cover, setCover] = useState<CoverOption["id"]>("cash");
  const [pending, setPending] = useState(false);

  function onAdd() {
    if (!name.trim()) return;
    setPending(true);
    setTimeout(() => {
      router.push(`/door/events/${params.id}`);
    }, 600);
  }

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--w-line)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="w-type-meta">
              DOOR · BR · BK 023 · WALK-UP
            </div>
            <div
              style={{
                fontFamily: "var(--w-display)",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "-0.02em",
                marginTop: 4,
              }}
            >
              Add walk-in
            </div>
          </div>
          <Wordmark variant="monogrid" size={14} />
        </div>

        <div
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <label htmlFor="walk-name" className="w-label">
              NAME
            </label>
            <input
              id="walk-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-input"
              placeholder="First Last"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="walk-phone" className="w-label">
              PHONE (OPTIONAL)
            </label>
            <input
              id="walk-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-input"
              placeholder="+1 ···"
            />
          </div>

          <div>
            <span className="w-label">TIER</span>
            <div style={{ display: "flex", gap: 8 }}>
              {TIERS.map((t) => {
                const active = tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    style={{
                      flex: 1,
                      height: 44,
                      background: active ? "var(--w-fg)" : "transparent",
                      color: active ? "var(--w-ink)" : "var(--w-fg)",
                      border: "1px solid var(--w-line-2)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="w-label">COVER COLLECTED?</span>
            <div style={{ display: "flex", gap: 8 }}>
              {COVER.map((c) => {
                const active = cover === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCover(c.id)}
                    style={{
                      flex: 1,
                      height: 44,
                      background: active
                        ? "var(--w-acc)"
                        : "transparent",
                      color: active
                        ? "var(--w-acc-ink)"
                        : c.muted
                          ? "var(--w-fg-muted)"
                          : "var(--w-fg)",
                      border: active ? 0 : "1px solid var(--w-line-2)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="w-card"
            style={{
              padding: 14,
              marginTop: 4,
              background: "oklch(0.86 0.16 85 / 0.08)",
              borderColor: "oklch(0.86 0.16 85 / 0.3)",
            }}
          >
            <Chip tone="warn">CAP CHECK</Chip>
            <p
              className="w-type-body-sm"
              style={{ marginTop: 6 }}
            >
              GA at 372 of 380. Walk-in eats the buffer.
            </p>
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            padding: 20,
            background:
              "linear-gradient(to top, var(--w-bg) 60%, transparent)",
            marginTop: "auto",
          }}
        >
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!name.trim() || pending}
            onClick={onAdd}
          >
            {pending ? "Adding…" : "Add + check in"}
          </Button>
        </div>
      </WFrame>
    </main>
  );
}
