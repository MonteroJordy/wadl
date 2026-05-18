"use client";

import { useMemo, useState, useTransition } from "react";
import { createEventAction } from "./actions";
import type { EventType } from "@/lib/types";
import { Breadcrumb, Cover, PageHeader } from "@/components/v5";
import { useFormSaveShortcut } from "@/components/use-form-save-shortcut";

/* ─── Types ───────────────────────────────────────────────────────── */

interface NightRow {
  key: string;
  date: string;
  time: string;
  capacity: string;
}

interface TierRow {
  key: string;
  /** Short label shown on the chip (e.g. "GA", "VIP", "AAA"). */
  label: string;
  /** Total cap across the event for this tier. */
  cap: string;
  /** Chip tone — drives the colored dot + chip class hint. */
  tone: "neutral" | "info" | "warn" | "err" | "ok";
  /** Token slug used for the per-tier link preview (?t=ga). */
  slug: string;
}

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "venue_owned", label: "Venue-owned" },
  { id: "brand_takeover", label: "Brand takeover" },
  { id: "co_produced", label: "Co-produced" },
  { id: "brand_pop_up", label: "Brand pop-up" },
];

/* tone → hex hint for the colored dot in the tier row (matches design). */
const TONE_HEX: Record<TierRow["tone"], string> = {
  neutral: "#737373",
  info: "#60a5fa",
  warn: "#fbbf24",
  err: "#f87171",
  ok: "#4ade80",
};

const TONE_OPTIONS: TierRow["tone"][] = [
  "neutral",
  "info",
  "warn",
  "err",
  "ok",
];

function newNight(): NightRow {
  return {
    key: crypto.randomUUID(),
    date: "",
    time: "22:00",
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
    {
      key: crypto.randomUUID(),
      label: "GA",
      cap: "200",
      tone: "neutral",
      slug: "ga",
    },
    {
      key: crypto.randomUUID(),
      label: "VIP",
      cap: "80",
      tone: "warn",
      slug: "vip",
    },
    {
      key: crypto.randomUUID(),
      label: "AAA",
      cap: "40",
      tone: "err",
      slug: "aaa",
    },
  ];
}

/* ─── Form ────────────────────────────────────────────────────────── */

export default function NewEventForm({
  venues,
  defaultCapacity,
  defaultEventType,
  accountType = "venue",
}: {
  venues: { id: string; name: string }[];
  defaultCapacity: number | null;
  defaultEventType: EventType;
  accountType?: "venue" | "brand" | "individual";
}) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<EventType>(defaultEventType);
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "none");
  const [partnerVenue, setPartnerVenue] = useState("");
  const [description, setDescription] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [flyerWarn, setFlyerWarn] = useState<string | null>(null);
  const [nights, setNights] = useState<NightRow[]>([newNight()]);
  const [tiers, setTiers] = useState<TierRow[]>(defaultTiers());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useFormSaveShortcut();

  const isMultiNight = nights.length > 1;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFlyerFile(f);
    setFlyerWarn(null);
    if (!f) {
      setFlyerPreview(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setFlyerPreview(url);
    /* Soft 4:5 ratio check — warn only, don't reject (per spec). */
    const img = new Image();
    img.onload = () => {
      if (img.width <= 0 || img.height <= 0) return;
      const ratio = img.width / img.height;
      const target = 4 / 5;
      const drift = Math.abs(ratio - target) / target;
      if (drift > 0.06) {
        setFlyerWarn(
          `Heads up — that's ${img.width}×${img.height}. Cover renders at 4:5 so we'll center-crop.`,
        );
      }
    };
    img.src = url;
  }

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
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        /* Keep slug in sync when label changes and slug wasn't manually overridden. */
        if (patch.label !== undefined && r.slug === slugify(r.label)) {
          next.slug = slugify(next.label) || `tier-${i + 1}`;
        }
        return next;
      }),
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
        slug: "",
      },
    ]);
  }

  /* ── Derived for preview ─────────────────────────────────────── */
  const totalCap = useMemo(() => {
    return nights.reduce((sum, n) => {
      const v = n.capacity ? parseInt(n.capacity, 10) : defaultCapacity ?? 0;
      return sum + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
  }, [nights, defaultCapacity]);

  const firstNight = nights[0];
  const previewDate = firstNight?.date
    ? new Date(`${firstNight.date}T${firstNight.time || "22:00"}:00`)
    : null;
  const previewMeta = previewDate
    ? `${previewDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
      })} · ${firstNight.time || "22:00"}`
    : "Pick a date";

  /* ── Submit ──────────────────────────────────────────────────── */
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Event name required.");
    if (nights.length === 0) return setError("Add at least one night.");
    if (tiers.length === 0) {
      return setError("Add at least one credential tier.");
    }

    /* Tier validation — label + cap >= 1 for every row. */
    for (const t of tiers) {
      if (!t.label.trim()) return setError("Every tier needs a label.");
      const capN = parseInt(t.cap, 10);
      if (!Number.isFinite(capN) || capN < 1) {
        return setError(`Tier "${t.label}" needs a cap of at least 1.`);
      }
    }
    /* Slugs must be unique so per-tier links don't collide. */
    const slugs = tiers.map((t) => slugify(t.slug || t.label));
    if (new Set(slugs).size !== slugs.length) {
      return setError("Two tiers share the same link slug — rename one.");
    }

    let nightPayload: Array<{
      night_date: string;
      doors_at: string;
      cutoff_at: null;
      capacity_cap: number | null;
    }>;
    try {
      nightPayload = nights.map((n) => {
        if (!n.date) throw new Error("Every night needs a date.");
        const doors = new Date(`${n.date}T${n.time || "22:00"}:00`);
        return {
          night_date: n.date,
          doors_at: doors.toISOString(),
          cutoff_at: null,
          capacity_cap: n.capacity
            ? parseInt(n.capacity, 10)
            : defaultCapacity,
        };
      });
    } catch (err) {
      return setError((err as Error).message);
    }

    for (const n of nightPayload) {
      if (!n.doors_at || Number.isNaN(new Date(n.doors_at).getTime())) {
        return setError("One of the nights has an invalid doors time.");
      }
    }

    const tierPayload = tiers.map((t, i) => ({
      label: t.label.trim(),
      cap: parseInt(t.cap, 10),
      tone: t.tone,
      slug: slugify(t.slug || t.label) || `tier-${i + 1}`,
    }));

    let composedDescription = description.trim();
    if (accountType !== "venue" && partnerVenue.trim()) {
      const prefix = `at ${partnerVenue.trim()}`;
      composedDescription = composedDescription
        ? `${prefix}\n\n${composedDescription}`
        : prefix;
    }

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("event_type", eventType);
    fd.set("venue_id", accountType === "venue" ? venueId : "none");
    fd.set("description", composedDescription);
    fd.set("flyer_url", flyerUrl.trim());
    fd.set("nights", JSON.stringify(nightPayload));
    fd.set("tiers", JSON.stringify(tierPayload));
    if (flyerFile) fd.set("flyer_file", flyerFile);

    startTransition(async () => {
      const result = await createEventAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  const labelStyle: React.CSSProperties = { display: "block" };

  /* ── Render ──────────────────────────────────────────────────── */
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
            className="btn"
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
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "var(--s-8)",
          alignItems: "start",
        }}
        className="new-event-cols"
      >
        {/* ─── FIELDS COLUMN ─── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-6)",
          }}
        >
          {/* Title */}
          <div>
            <label htmlFor="name" className="t-meta" style={labelStyle}>
              Title
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Donato Dozzy"
              required
              autoFocus
              style={{
                marginTop: "var(--s-2)",
                fontSize: 24,
                height: 60,
                fontWeight: 600,
              }}
            />
          </div>

          {/* Event type — compact pill row */}
          <div>
            <span className="t-meta">Event type</span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--s-2)",
                marginTop: "var(--s-2)",
              }}
            >
              {EVENT_TYPES.map((t) => {
                const active = eventType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEventType(t.id)}
                    className={
                      "btn btn--sm " + (active ? "" : "btn--ghost")
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Venue / partner */}
          {accountType === "venue" && venues.length > 0 && (
            <div>
              <label
                htmlFor="venue"
                className="t-meta"
                style={labelStyle}
              >
                Venue
              </label>
              <select
                id="venue"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="input"
                style={{ marginTop: "var(--s-2)" }}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
                <option value="none">No venue</option>
              </select>
            </div>
          )}

          {accountType !== "venue" && (
            <div>
              <label
                htmlFor="partnerVenue"
                className="t-meta"
                style={labelStyle}
              >
                {accountType === "brand"
                  ? "Venue partner"
                  : "Venue (free text)"}
              </label>
              <input
                id="partnerVenue"
                type="text"
                value={partnerVenue}
                onChange={(e) => setPartnerVenue(e.target.value)}
                placeholder={
                  accountType === "brand"
                    ? "Wynwood Studios"
                    : "Floyd Miami"
                }
                className="input"
                style={{ marginTop: "var(--s-2)" }}
              />
              <p className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                {accountType === "brand"
                  ? "The venue hosting this event"
                  : "Where the night is happening"}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="t-meta"
              style={labelStyle}
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              style={{
                marginTop: "var(--s-2)",
                height: 96,
                padding: "var(--s-3) var(--s-4)",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              placeholder="Guest list open 10–midnight…"
            />
          </div>

          {/* Cover upload — 4:5 */}
          <div>
            <span className="t-meta">Cover · 4:5</span>
            <div
              style={{
                marginTop: "var(--s-2)",
                display: "flex",
                gap: "var(--s-4)",
              }}
            >
              <label
                htmlFor="flyer-file"
                style={{
                  width: 160,
                  aspectRatio: "4 / 5",
                  background: flyerPreview ? "transparent" : "var(--bg-3)",
                  borderRadius: "var(--r-md)",
                  border: "1.5px dashed var(--line-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "var(--s-2)",
                  cursor: "pointer",
                  overflow: "hidden",
                  flex: "0 0 auto",
                }}
              >
                {flyerPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flyerPreview}
                    alt="Cover preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      +
                    </div>
                    <span className="t-meta">Drop or click</span>
                  </>
                )}
              </label>
              <div style={{ flex: 1 }}>
                <div className="t-body-2">
                  Best results · JPG / PNG, 4:5 aspect, 1080×1350+
                  recommended. We crop on every surface (hero, card, wallet,
                  share).
                </div>
                <input
                  id="flyer-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPickFile}
                  style={{
                    display: "block",
                    marginTop: "var(--s-3)",
                    fontSize: 13,
                  }}
                />
                <div className="t-meta" style={{ marginTop: "var(--s-4)" }}>
                  Or paste a URL
                </div>
                <input
                  id="flyer-url"
                  type="url"
                  value={flyerUrl}
                  onChange={(e) => setFlyerUrl(e.target.value)}
                  className="input"
                  placeholder="https://…"
                  style={{ marginTop: "var(--s-2)" }}
                />
                {flyerWarn ? (
                  <p
                    className="t-meta"
                    style={{
                      marginTop: "var(--s-2)",
                      color: "var(--warn)",
                    }}
                  >
                    {flyerWarn}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Schedule toggle */}
          <div>
            <span className="t-meta">Schedule</span>
            <div
              style={{
                display: "flex",
                gap: "var(--s-2)",
                marginTop: "var(--s-2)",
              }}
            >
              {[
                { single: true, l: "Single night" },
                { single: false, l: "Multi-night" },
              ].map((o) => {
                const active = isMultiNight ? !o.single : o.single;
                return (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => {
                      if (o.single && nights.length > 1) {
                        setNights([nights[0]]);
                      } else if (!o.single && nights.length === 1) {
                        setNights([nights[0], newNight()]);
                      }
                    }}
                    className={
                      "btn btn--sm " + (active ? "" : "btn--ghost")
                    }
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nights */}
          <div>
            <span className="t-meta">Nights · {nights.length}</span>
            <div className="card" style={{ marginTop: "var(--s-2)" }}>
              {nights.map((n, i) => (
                <div
                  key={n.key}
                  style={{
                    padding: "var(--s-4) var(--s-5)",
                    borderBottom:
                      i === nights.length - 1
                        ? "0"
                        : "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "var(--s-3)",
                    }}
                  >
                    <span className="chip chip--ghost">
                      Night {String(i + 1).padStart(2, "0")}
                    </span>
                    {nights.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNight(i)}
                        className="t-meta"
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--err)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "var(--s-3)",
                    }}
                  >
                    <div>
                      <span className="t-meta">Date</span>
                      <input
                        type="date"
                        value={n.date}
                        onChange={(e) =>
                          updateNight(i, { date: e.target.value })
                        }
                        className="input"
                        style={{ marginTop: "var(--s-2)" }}
                        required
                      />
                    </div>
                    <div>
                      <span className="t-meta">Doors</span>
                      <input
                        type="time"
                        value={n.time}
                        onChange={(e) =>
                          updateNight(i, { time: e.target.value })
                        }
                        className="input"
                        style={{ marginTop: "var(--s-2)" }}
                        required
                      />
                    </div>
                    <div>
                      <span className="t-meta">Capacity</span>
                      <input
                        type="number"
                        min={1}
                        value={n.capacity}
                        onChange={(e) =>
                          updateNight(i, { capacity: e.target.value })
                        }
                        className="input"
                        style={{ marginTop: "var(--s-2)" }}
                        placeholder={
                          defaultCapacity
                            ? `${defaultCapacity}`
                            : "e.g. 400"
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setNights((r) => [...r, newNight()])}
              style={{ marginTop: "var(--s-3)" }}
            >
              + Add another night
            </button>
          </div>

          {/* Tiers — credential editor */}
          <div>
            <div className="t-meta">
              Tiers · auto-creates invite links per tier
            </div>
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
                      gridTemplateColumns:
                        "14px 120px 1fr 90px 100px 24px",
                      alignItems: "center",
                      gap: "var(--s-3)",
                    }}
                  >
                    {/* color dot — clickable cycles tones */}
                    <button
                      type="button"
                      onClick={() => {
                        const idx = TONE_OPTIONS.indexOf(t.tone);
                        const next =
                          TONE_OPTIONS[(idx + 1) % TONE_OPTIONS.length];
                        updateTier(i, { tone: next });
                      }}
                      aria-label={`Cycle color · current ${t.tone}`}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "var(--r-pill)",
                        background: TONE_HEX[t.tone],
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
                      placeholder="GA"
                      aria-label="Tier label"
                      className="input"
                      style={{ height: 36, fontWeight: 600 }}
                    />
                    <input
                      type="text"
                      value={t.slug}
                      onChange={(e) =>
                        updateTier(i, { slug: slugify(e.target.value) })
                      }
                      placeholder={slugify(t.label) || "slug"}
                      aria-label="Link slug"
                      className="input"
                      style={{
                        height: 36,
                        fontFamily: "var(--mono)",
                        fontSize: 13,
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={t.cap}
                      onChange={(e) =>
                        updateTier(i, { cap: e.target.value })
                      }
                      placeholder="cap"
                      aria-label="Cap"
                      className="input"
                      style={{ height: 36 }}
                    />
                    <span
                      className="t-meta"
                      style={{ color: "var(--fg-3)" }}
                    >
                      {t.tone}
                    </span>
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
                          justifySelf: "end",
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
              className="btn btn--ghost btn--sm"
              onClick={addTier}
              style={{ marginTop: "var(--s-2)" }}
            >
              + Add tier
            </button>
          </div>

          {/* Per-tier shareable link previews (read-only) */}
          <div>
            <div className="t-meta">
              Per-tier links · preview · auto-close on cap
            </div>
            <div
              style={{
                marginTop: "var(--s-2)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-2)",
              }}
            >
              {tiers.map((t, i) => {
                const slug = slugify(t.slug || t.label) || `tier-${i + 1}`;
                const capN = parseInt(t.cap, 10);
                const displayCap =
                  Number.isFinite(capN) && capN > 0 ? capN : "—";
                return (
                  <div
                    key={t.key}
                    className="chip chip--ghost"
                    style={{
                      height: "auto",
                      padding: "var(--s-2) var(--s-3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--s-3)",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "var(--r-pill)",
                          background: TONE_HEX[t.tone],
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>
                        {t.label || `Tier ${i + 1}`}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 12,
                          color: "var(--fg-3)",
                        }}
                      >
                        /e/&lt;id&gt;?t={slug}
                      </span>
                    </span>
                    <span className="t-meta">0/{displayCap}</span>
                  </div>
                );
              })}
              <p className="t-meta">
                Generated after publish · each link fills its own cap then
                auto-closes.
              </p>
            </div>
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
            className="btn btn--lg btn--block"
            disabled={pending}
          >
            {pending ? "Publishing…" : "Publish event"}
          </button>
        </div>

        {/* ─── LIVE PREVIEW COLUMN ─── */}
        <div style={{ position: "sticky", top: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Preview
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4 / 5",
                overflow: "hidden",
              }}
            >
              {flyerPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flyerPreview}
                    alt="Cover preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)",
                    }}
                  />
                </>
              ) : (
                <Cover
                  seed={name || "new event"}
                  height={0}
                  style={{ position: "absolute", inset: 0, height: "100%" }}
                />
              )}
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
            </div>
            <div
              style={{
                padding: "var(--s-4)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--s-2)",
                }}
              >
                <span className="chip">Draft</span>
                <span className="chip chip--ghost">
                  {totalCap > 0 ? `cap ${totalCap}` : "no cap"}
                </span>
                <span className="chip chip--ghost">
                  {nights.length} night{nights.length === 1 ? "" : "s"}
                </span>
              </div>
              <div
                className="t-body-2"
                style={{ color: "var(--fg-3)" }}
              >
                {EVENT_TYPES.find((t) => t.id === eventType)?.label}
              </div>
              {tiers.length > 0 && (
                <div>
                  <div className="t-meta">Tiers</div>
                  <div
                    style={{
                      marginTop: "var(--s-2)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--s-1)",
                    }}
                  >
                    {tiers.map((t, i) => {
                      const capN = parseInt(t.cap, 10);
                      const displayCap =
                        Number.isFinite(capN) && capN > 0 ? capN : "—";
                      return (
                        <span
                          key={t.key}
                          className="chip chip--ghost"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "var(--r-pill)",
                              background: TONE_HEX[t.tone],
                              display: "inline-block",
                            }}
                          />
                          {t.label || `Tier ${i + 1}`} · {displayCap}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
