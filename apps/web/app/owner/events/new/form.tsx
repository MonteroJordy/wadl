"use client";

import { useState, useTransition } from "react";
import { createEventAction } from "./actions";
import type { EventType } from "@/lib/types";
import { Breadcrumb, Cover, PageHeader } from "@/components/v5";
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

  const labelStyle: React.CSSProperties = { display: "block" };
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

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb items={[["Events", "/owner"], "New event"]} />
      <PageHeader
        eyebrow="New event"
        title="Create an event"
        sub="Fill in the basics — we'll auto-publish a public RSVP page."
        actions={
          <button
            type="submit"
            form="new-event-form"
            className="btn"
            disabled={pending}
          >
            {pending ? "Creating…" : "Publish"}
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
              placeholder="Space presents: Diplo"
              required
              autoFocus
              style={{
                marginTop: "var(--s-2)",
                fontSize: 22,
                height: 56,
              }}
            />
          </div>

          {/* Event type */}
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

          {/* Venue */}
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
                  ? "Where the takeover lands · directory ships later"
                  : "Venue for the night · free text for now"}
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

          {/* Cover upload */}
          <div>
            <span className="t-meta">Cover · 4:5</span>
            <input
              id="flyer-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickFile}
              className="input"
              style={{
                marginTop: "var(--s-2)",
                paddingTop: 10,
                height: "auto",
                fontSize: 13,
              }}
            />
            <p className="t-meta" style={{ marginTop: "var(--s-2)" }}>
              Or paste a URL
            </p>
            <input
              id="flyer-url"
              type="url"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              className="input"
              placeholder="https://…"
              style={{ marginTop: "var(--s-2)" }}
            />
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
            {pending ? "Creating…" : "Create event"}
          </button>
        </div>

        {/* ─── LIVE PREVIEW COLUMN ─── */}
        <div>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Live preview
          </div>
          <div className="card">
            {flyerPreview ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 180,
                  overflow: "hidden",
                }}
              >
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
                    style={{
                      marginTop: "var(--s-1)",
                      color: "#fff",
                    }}
                  >
                    {name || "Untitled event"}
                  </div>
                </div>
              </div>
            ) : (
              <Cover seed={name || "new event"} height={180}>
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
                    style={{
                      marginTop: "var(--s-1)",
                      color: "#fff",
                    }}
                  >
                    {name || "Untitled event"}
                  </div>
                </div>
              </Cover>
            )}
            <div style={{ padding: "var(--s-4)" }}>
              <span className="chip">Draft</span>
              <div
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                {nights.length} night{nights.length === 1 ? "" : "s"} ·{" "}
                {EVENT_TYPES.find((t) => t.id === eventType)?.label}
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
