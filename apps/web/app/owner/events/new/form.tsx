"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createEventAction } from "./actions";
import type { EventType } from "@/lib/types";
import {
  Button,
  Chip,
  CoverPlaceholder,
  IconArrow,
  IconPlus,
  WFrame,
  Wordmark,
} from "@/components/wadl";
import { useFormSaveShortcut } from "@/components/use-form-save-shortcut";

interface NightRow {
  key: string;
  date: string;
  time: string;
  capacity: string;
}

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "venue_owned", label: "Venue-owned" },
  { id: "brand_takeover", label: "Brand takeover" },
  { id: "co_produced", label: "Co-produced" },
  { id: "brand_pop_up", label: "Brand pop-up" },
];

function newNight(): NightRow {
  return {
    key: crypto.randomUUID(),
    date: "",
    time: "22:00",
    capacity: "",
  };
}

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
  const [nights, setNights] = useState<NightRow[]>([newNight()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useFormSaveShortcut();

  const isMultiNight = nights.length > 1;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFlyerFile(f);
    setFlyerPreview(f ? URL.createObjectURL(f) : null);
  }

  function updateNight(i: number, patch: Partial<NightRow>) {
    setNights((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  function removeNight(i: number) {
    setNights((rows) => rows.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Event name required.");
    if (nights.length === 0) return setError("Add at least one night.");

    let payload: Array<{
      night_date: string;
      doors_at: string;
      cutoff_at: null;
      capacity_cap: number | null;
    }>;
    try {
      payload = nights.map((n) => {
        if (!n.date) throw new Error("every night needs a date");
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

    for (const n of payload) {
      if (!n.doors_at || Number.isNaN(new Date(n.doors_at).getTime())) {
        return setError("One of the nights has an invalid doors time.");
      }
    }

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
    fd.set("nights", JSON.stringify(payload));
    if (flyerFile) fd.set("flyer_file", flyerFile);

    startTransition(async () => {
      const result = await createEventAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main id="main-content">
      {/* .new-event-cols layout rules live in globals.css. */}
      <WFrame wide maxWidth={1080} style={{ paddingBottom: 96 }}>
        {/* Top bar — minimal: just the back link. We're already inside the
            sidebar shell so brand + step indicator are redundant chrome. */}
        <div
          style={{
            padding: "20px 24px 0",
          }}
        >
          <Link
            href="/owner"
            className="w-type-meta"
            style={{ textDecoration: "none", color: "var(--w-fg-muted)" }}
          >
            ← BACK
          </Link>
        </div>

        <div style={{ padding: "20px 24px 0" }}>
          <div className="w-type-meta">NEW EVENT</div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            Build it.
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="new-event-cols"
          style={{
            padding: "32px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* COVER COLUMN (desktop left rail / mobile top section) */}
          <div className="new-event-cover">
            <span className="w-label">COVER · 4:5</span>
            {flyerPreview ? (
              <div
                className="new-event-cover-preview"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  aspectRatio: "4 / 5",
                  border: "1px solid var(--w-line)",
                  background: "var(--w-surface-2)",
                  overflow: "hidden",
                  marginTop: 6,
                  marginBottom: 8,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flyerPreview}
                  alt="Flyer preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            ) : (
              <div
                className="new-event-cover-preview"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  marginTop: 6,
                  marginBottom: 8,
                }}
              >
                <CoverPlaceholder />
              </div>
            )}
            <input
              id="flyer-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickFile}
              className="w-input"
              style={{ height: 44, fontSize: 13 }}
            />
            <p className="w-type-meta" style={{ marginTop: 8 }}>
              OR PASTE A URL
            </p>
            <input
              id="flyer-url"
              type="url"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              className="w-input"
              placeholder="https://…"
              style={{ marginTop: 4 }}
            />
          </div>

          {/* FIELDS COLUMN (desktop right / mobile rest of stack) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >

          {/* Title */}
          <div>
            <label htmlFor="name" className="w-label">
              TITLE
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-input"
              placeholder="Space presents: Diplo"
              required
              autoFocus
            />
          </div>

          {/* Event type — compact pills, wrap to fit. */}
          <div>
            <span className="w-label">EVENT TYPE</span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 6,
              }}
            >
              {EVENT_TYPES.map((t) => {
                const active = eventType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEventType(t.id)}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      background: active
                        ? "var(--w-acc-soft)"
                        : "transparent",
                      border: "1px solid",
                      borderColor: active
                        ? "var(--w-acc)"
                        : "var(--w-line-2)",
                      color: active
                        ? "var(--w-fg)"
                        : "var(--w-fg-muted)",
                      fontFamily: "var(--w-sans)",
                      fontWeight: active ? 600 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Venue (account-type aware) */}
          {accountType === "venue" && venues.length > 0 && (
            <div>
              <label htmlFor="venue" className="w-label">
                VENUE
              </label>
              <select
                id="venue"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-input"
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
              <label htmlFor="partnerVenue" className="w-label">
                {accountType === "brand"
                  ? "VENUE PARTNER"
                  : "VENUE (FREE TEXT)"}
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
                className="w-input"
              />
              <p className="w-type-meta" style={{ marginTop: 6 }}>
                {accountType === "brand"
                  ? "WHERE THE TAKEOVER LANDS · DIRECTORY SHIPS LATER"
                  : "VENUE FOR THE NIGHT · FREE TEXT FOR NOW"}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="w-label">
              DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-input"
              style={{
                height: 96,
                padding: "12px 16px",
                resize: "vertical",
              }}
              placeholder="Guest list open 10–midnight…"
            />
          </div>

          {/* Schedule toggle */}
          <div>
            <span className="w-label">SCHEDULE</span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                padding: 4,
                background: "#ffffff08",
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
                    style={{
                      height: 40,
                      border: 0,
                      background: active ? "var(--w-fg)" : "transparent",
                      color: active
                        ? "var(--w-ink)"
                        : "var(--w-fg-muted)",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nights */}
          <div>
            <span className="w-label">NIGHTS · {nights.length}</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {nights.map((n, i) => (
                <div
                  key={n.key}
                  className="w-card"
                  style={{ padding: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <Chip tone="ghost">
                      NIGHT {String(i + 1).padStart(2, "0")}
                    </Chip>
                    {nights.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNight(i)}
                        className="w-type-meta"
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--w-err)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        REMOVE
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <span className="w-type-meta">DATE</span>
                      <input
                        type="date"
                        value={n.date}
                        onChange={(e) =>
                          updateNight(i, { date: e.target.value })
                        }
                        className="w-input"
                        style={{ height: 44, marginTop: 4 }}
                        required
                      />
                    </div>
                    <div>
                      <span className="w-type-meta">DOORS</span>
                      <input
                        type="time"
                        value={n.time}
                        onChange={(e) =>
                          updateNight(i, { time: e.target.value })
                        }
                        className="w-input"
                        style={{ height: 44, marginTop: 4 }}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className="w-type-meta">CAPACITY</span>
                    <input
                      type="number"
                      min={1}
                      value={n.capacity}
                      onChange={(e) =>
                        updateNight(i, { capacity: e.target.value })
                      }
                      className="w-input"
                      style={{ height: 44, marginTop: 4 }}
                      placeholder={
                        defaultCapacity
                          ? `default ${defaultCapacity}`
                          : "e.g. 400"
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              block
              onClick={() => setNights((r) => [...r, newNight()])}
              style={{ marginTop: 10 }}
            >
              <IconPlus size={14} /> Add another night
            </Button>
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
            disabled={pending}
          >
            {pending ? "Creating…" : "Create event"} <IconArrow size={14} />
          </Button>
          </div>
          {/* end fields column */}
        </form>
      </WFrame>
    </main>
  );
}
