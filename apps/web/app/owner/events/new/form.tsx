"use client";

import { useMemo, useState, useTransition } from "react";
import { createEventAction } from "./actions";
import type { EventType } from "@/lib/types";
import { Breadcrumb, Cover, PageHeader } from "@/components/v5";
import { useFormSaveShortcut } from "@/components/use-form-save-shortcut";

/* ─── Types ───────────────────────────────────────────────────────── */

interface NightRow {
  key: string;
  date: string; // yyyy-mm-dd
  doors: string; // HH:mm
  close: string; // HH:mm
  capacity: string;
}

interface TierRow {
  key: string;
  label: string;
  cap: string;
  /** Drives the colored dot · cycles on click. */
  tone: "neutral" | "info" | "warn" | "err" | "ok";
}

const TONE_HEX: Record<TierRow["tone"], string> = {
  neutral: "#737373",
  info: "#60a5fa",
  warn: "#fbbf24",
  err: "#f87171",
  ok: "#4ade80",
};
const TONE_OPTIONS: TierRow["tone"][] = [
  "neutral",
  "warn",
  "err",
  "ok",
  "info",
];

function newNight(): NightRow {
  return {
    key: crypto.randomUUID(),
    date: "",
    doors: "22:00",
    close: "04:00",
    capacity: "",
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
}

function defaultTiers(): TierRow[] {
  return [
    { key: crypto.randomUUID(), label: "GA", cap: "200", tone: "neutral" },
    { key: crypto.randomUUID(), label: "VIP", cap: "80", tone: "warn" },
    { key: crypto.randomUUID(), label: "AAA", cap: "40", tone: "err" },
  ];
}

/* ─── Form — matches V5CreateEventV2 exactly ──────────────────────── */

export default function NewEventForm({
  defaultCapacity,
  defaultEventType,
  venues,
  accountType = "venue",
}: {
  venues: { id: string; name: string }[];
  defaultCapacity: number | null;
  defaultEventType: EventType;
  accountType?: "venue" | "brand" | "individual";
}) {
  const [name, setName] = useState("");
  const [nights, setNights] = useState<NightRow[]>([newNight()]);
  const [tiers, setTiers] = useState<TierRow[]>(defaultTiers());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useFormSaveShortcut();

  const firstNight = nights[0];
  const venueId = venues[0]?.id ?? "none";

  function updateNight(i: number, patch: Partial<NightRow>) {
    setNights((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeNight(i: number) {
    setNights((rows) => rows.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, patch: Partial<TierRow>) {
    setTiers((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeTier(i: number) {
    setTiers((rows) => rows.filter((_, idx) => idx !== i));
  }
  function addTier() {
    setTiers((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        label: "",
        cap: "",
        tone: TONE_OPTIONS[rows.length % TONE_OPTIONS.length],
      },
    ]);
  }
  function cycleTone(i: number) {
    setTiers((rows) =>
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const next =
          TONE_OPTIONS[
            (TONE_OPTIONS.indexOf(r.tone) + 1) % TONE_OPTIONS.length
          ];
        return { ...r, tone: next };
      }),
    );
  }

  /* ── Preview meta ────────────────────────────────────────────── */
  const previewMeta = useMemo(() => {
    if (!firstNight?.date) return "Pick a date";
    const d = new Date(`${firstNight.date}T${firstNight.doors || "22:00"}:00`);
    return `${d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
    })} · ${firstNight.doors || "22:00"}`;
  }, [firstNight]);

  const totalCap = useMemo(
    () =>
      tiers.reduce(
        (s, t) => s + (Number.isFinite(parseInt(t.cap, 10)) ? parseInt(t.cap, 10) : 0),
        0,
      ),
    [tiers],
  );

  /* ── Submit ──────────────────────────────────────────────────── */
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Title required.");
    if (nights.length === 0) return setError("Add at least one night.");
    if (tiers.length === 0) return setError("Add at least one tier.");

    for (const t of tiers) {
      if (!t.label.trim()) return setError("Every tier needs a label.");
      const capN = parseInt(t.cap, 10);
      if (!Number.isFinite(capN) || capN < 1) {
        return setError(`Tier "${t.label}" needs a cap of at least 1.`);
      }
    }
    const slugs = tiers.map((t) => slugify(t.label));
    if (new Set(slugs).size !== slugs.length) {
      return setError("Two tiers share the same slug — rename one.");
    }

    let nightPayload: Array<{
      night_date: string;
      doors_at: string;
      cutoff_at: string | null;
      capacity_cap: number | null;
    }>;
    try {
      nightPayload = nights.map((n) => {
        if (!n.date) throw new Error("Every night needs a date.");
        const doors = new Date(`${n.date}T${n.doors || "22:00"}:00`);
        // Close time on the next day if it's before doors (e.g. 04:00 after 22:00)
        let close: Date | null = null;
        if (n.close) {
          close = new Date(`${n.date}T${n.close}:00`);
          if (close.getTime() <= doors.getTime()) {
            close = new Date(close.getTime() + 24 * 60 * 60 * 1000);
          }
        }
        return {
          night_date: n.date,
          doors_at: doors.toISOString(),
          cutoff_at: close?.toISOString() ?? null,
          capacity_cap: n.capacity ? parseInt(n.capacity, 10) : defaultCapacity,
        };
      });
    } catch (err) {
      return setError((err as Error).message);
    }

    const tierPayload = tiers.map((t) => ({
      label: t.label.trim(),
      cap: parseInt(t.cap, 10),
      tone: t.tone,
      slug: slugify(t.label) || "tier",
    }));

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("event_type", defaultEventType);
    fd.set("venue_id", accountType === "venue" ? venueId : "none");
    fd.set("description", "");
    fd.set("flyer_url", "");
    fd.set("nights", JSON.stringify(nightPayload));
    fd.set("tiers", JSON.stringify(tierPayload));

    startTransition(async () => {
      const result = await createEventAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  /* ── Render ──────────────────────────────────────────────────── */
  const tierTone = (t: TierRow) => TONE_HEX[t.tone];

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb items={[["Events", "/owner"], "New event"]} />
      <PageHeader
        eyebrow="New event"
        title="Tell us about it"
        sub="Live preview on the right. Publish when you're ready."
        actions={
          <button
            type="submit"
            form="new-event-form"
            className="btn btn--accent"
            disabled={pending}
          >
            {pending ? "Publishing…" : "Publish"}
          </button>
        }
      />

      <form
        id="new-event-form"
        ref={formRef}
        onSubmit={onSubmit}
        style={{
          padding: "var(--s-8)",
          maxWidth: 1120,
          marginInline: "auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: "var(--s-8)",
          alignItems: "start",
        }}
        className="new-event-cols"
      >
        {/* ─── FIELDS ─── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-6)",
          }}
        >
          {/* Title */}
          <div>
            <div className="t-meta">Title</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Donato Dozzy"
              autoFocus
              required
              className="input"
              style={{
                marginTop: "var(--s-2)",
                fontSize: 24,
                height: 60,
                fontWeight: 600,
              }}
            />
          </div>

          {/* 2x2 grid: Date · Doors · Close · Capacity */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--s-4)",
            }}
          >
            <div>
              <div className="t-meta">Date</div>
              <input
                type="date"
                value={firstNight?.date ?? ""}
                onChange={(e) => updateNight(0, { date: e.target.value })}
                required
                className="input"
                style={{ marginTop: "var(--s-1)" }}
              />
            </div>
            <div>
              <div className="t-meta">Doors</div>
              <input
                type="time"
                value={firstNight?.doors ?? "22:00"}
                onChange={(e) => updateNight(0, { doors: e.target.value })}
                required
                className="input"
                style={{ marginTop: "var(--s-1)" }}
              />
            </div>
            <div>
              <div className="t-meta">Close</div>
              <input
                type="time"
                value={firstNight?.close ?? "04:00"}
                onChange={(e) => updateNight(0, { close: e.target.value })}
                className="input"
                style={{ marginTop: "var(--s-1)" }}
              />
            </div>
            <div>
              <div className="t-meta">Capacity</div>
              <input
                type="number"
                min={1}
                value={firstNight?.capacity ?? ""}
                onChange={(e) =>
                  updateNight(0, { capacity: e.target.value })
                }
                placeholder={defaultCapacity ? String(defaultCapacity) : "320"}
                className="input"
                style={{ marginTop: "var(--s-1)" }}
              />
            </div>
          </div>

          {/* Tiers · auto-creates invite links per tier */}
          <div>
            <div className="t-meta">Tiers · auto-creates invite links per tier</div>
            <div className="card" style={{ marginTop: "var(--s-2)" }}>
              {tiers.map((t, i) => {
                const isLast = i === tiers.length - 1;
                return (
                  <div
                    key={t.key}
                    style={{
                      padding: "var(--s-3) var(--s-5)",
                      borderBottom: isLast ? "0" : "1px solid var(--line)",
                      display: "grid",
                      gridTemplateColumns: "14px minmax(0, 1fr) 110px 28px",
                      alignItems: "center",
                      gap: "var(--s-3)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => cycleTone(i)}
                      aria-label={`Change color (current ${t.tone})`}
                      title="Click to change color"
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "var(--r-pill)",
                        background: tierTone(t),
                        border: 0,
                        padding: 0,
                        cursor: "pointer",
                        justifySelf: "center",
                      }}
                    />
                    <input
                      type="text"
                      value={t.label}
                      onChange={(e) =>
                        updateTier(i, { label: e.target.value })
                      }
                      placeholder="GA / VIP / AAA"
                      aria-label="Tier label"
                      className="input"
                      style={{ height: 36, fontWeight: 600 }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={t.cap}
                      onChange={(e) => updateTier(i, { cap: e.target.value })}
                      placeholder="cap"
                      aria-label="Cap"
                      className="input"
                      style={{ height: 36, textAlign: "right" }}
                    />
                    {tiers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeTier(i)}
                        aria-label="Remove tier"
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--fg-3)",
                          cursor: "pointer",
                          padding: 0,
                          justifySelf: "center",
                          fontSize: 18,
                        }}
                      >
                        ×
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addTier}
              className="btn btn--ghost btn--sm"
              style={{ marginTop: "var(--s-2)" }}
            >
              + Add tier
            </button>
          </div>

          {/* Multi-night affordance (single button — keep the design clean) */}
          {nights.length > 1 ? (
            <div>
              <div className="t-meta">Extra nights</div>
              <div
                className="card"
                style={{ marginTop: "var(--s-2)" }}
              >
                {nights.slice(1).map((n, idx) => {
                  const i = idx + 1;
                  return (
                    <div
                      key={n.key}
                      style={{
                        padding: "var(--s-3) var(--s-5)",
                        borderBottom:
                          i === nights.length - 1
                            ? "0"
                            : "1px solid var(--line)",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 28px",
                        gap: "var(--s-3)",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="date"
                        value={n.date}
                        onChange={(e) =>
                          updateNight(i, { date: e.target.value })
                        }
                        required
                        className="input"
                        style={{ height: 36 }}
                      />
                      <input
                        type="time"
                        value={n.doors}
                        onChange={(e) =>
                          updateNight(i, { doors: e.target.value })
                        }
                        className="input"
                        style={{ height: 36 }}
                      />
                      <input
                        type="number"
                        min={1}
                        value={n.capacity}
                        onChange={(e) =>
                          updateNight(i, { capacity: e.target.value })
                        }
                        placeholder="cap"
                        className="input"
                        style={{ height: 36, textAlign: "right" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeNight(i)}
                        aria-label="Remove night"
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--fg-3)",
                          cursor: "pointer",
                          padding: 0,
                          justifySelf: "center",
                          fontSize: 18,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setNights((rows) => [...rows, newNight()])}
            className="btn btn--ghost btn--sm"
            style={{ alignSelf: "flex-start" }}
          >
            + Add another night
          </button>

          {error ? (
            <p className="t-body-2" role="alert" style={{ color: "var(--err)" }}>
              {error}
            </p>
          ) : null}
        </div>

        {/* ─── LIVE PREVIEW ─── */}
        <aside style={{ position: "sticky", top: "var(--s-6)" }}>
          <div className="t-meta">Preview</div>
          <div
            className="card"
            style={{ marginTop: "var(--s-2)", overflow: "hidden" }}
          >
            <Cover seed={name || "new event"} height={240}>
              <div
                style={{
                  position: "absolute",
                  left: "var(--s-4)",
                  right: "var(--s-4)",
                  bottom: "var(--s-4)",
                }}
              >
                <div
                  className="t-meta"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {previewMeta}
                </div>
                <div
                  className="t-h1 truncate"
                  style={{ marginTop: "var(--s-1)", color: "#fff" }}
                >
                  {name || "Untitled event"}
                </div>
              </div>
            </Cover>
            <div
              style={{
                padding: "var(--s-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s-3)",
                flexWrap: "wrap",
              }}
            >
              <span className="chip">Draft · publish to share</span>
              <span className="t-meta">{totalCap || 0} cap</span>
            </div>
          </div>

          {/* Tier dots summary */}
          {tiers.length > 0 && (
            <div
              style={{
                marginTop: "var(--s-4)",
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--s-2)",
              }}
            >
              {tiers.map((t) => (
                <span
                  key={t.key}
                  className="chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--s-2)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "var(--r-pill)",
                      background: tierTone(t),
                    }}
                  />
                  {t.label || "·"} {t.cap ? `· ${t.cap}` : ""}
                </span>
              ))}
            </div>
          )}
        </aside>

        <style>{`
          @media (max-width: 880px) {
            .new-event-cols { grid-template-columns: 1fr !important; }
            .new-event-cols aside { position: static !important; }
          }
        `}</style>
      </form>
    </main>
  );
}
