"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createEventAction } from "./actions";
import type { EventType } from "@/lib/types";

interface NightRow {
  key: string;
  date: string;
  time: string;
  capacity: string;
}

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "venue_owned",    label: "Venue-owned" },
  { id: "brand_takeover", label: "Brand takeover" },
  { id: "co_produced",    label: "Co-produced" },
  { id: "brand_pop_up",   label: "Brand pop-up" },
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
}: {
  venues: { id: string; name: string }[];
  defaultCapacity: number | null;
}) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<EventType>("venue_owned");
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "none");
  const [description, setDescription] = useState("");
  const [flyerUrl, setFlyerUrl] = useState("");
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [nights, setNights] = useState<NightRow[]>([newNight()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFlyerFile(f);
    setFlyerPreview(f ? URL.createObjectURL(f) : null);
  }

  function updateNight(i: number, patch: Partial<NightRow>) {
    setNights((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeNight(i: number) {
    setNights((rows) => rows.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Event name required.");
    if (nights.length === 0) return setError("Add at least one night.");

    const payload = nights.map((n) => {
      if (!n.date) throw new Error("every night needs a date");
      // datetime-local style: YYYY-MM-DDTHH:mm (browser-local).
      const doors = new Date(`${n.date}T${n.time || "22:00"}:00`);
      return {
        night_date: n.date,
        doors_at: doors.toISOString(),
        cutoff_at: null,
        capacity_cap: n.capacity ? parseInt(n.capacity, 10) : defaultCapacity,
      };
    });

    for (const n of payload) {
      if (!n.doors_at || Number.isNaN(new Date(n.doors_at).getTime())) {
        return setError("One of the nights has an invalid doors time.");
      }
    }

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("event_type", eventType);
    fd.set("venue_id", venueId);
    fd.set("description", description.trim());
    fd.set("flyer_url", flyerUrl.trim());
    fd.set("nights", JSON.stringify(payload));
    if (flyerFile) fd.set("flyer_file", flyerFile);

    startTransition(async () => {
      const result = await createEventAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/owner" className="label-mono hover:text-cream transition">
          ← Back
        </Link>
        <p className="label-mono">New event</p>
      </header>

      <h1 className="display-lg mb-6">Build it.</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="label-mono block mb-2">Event name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark"
            placeholder="Space presents: Diplo"
            required
          />
        </div>

        <div>
          <p className="label-mono mb-2">Event type</p>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((t) => {
              const active = eventType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEventType(t.id)}
                  className={`border rounded-md px-3 py-3 text-left text-sm font-sans transition ${
                    active
                      ? "border-coral bg-s2 text-cream"
                      : "border-line bg-s1 text-muted hover:text-cream"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {venues.length > 0 && (
          <div>
            <label htmlFor="venue" className="label-mono block mb-2">Venue</label>
            <select
              id="venue"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="input-dark"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
              <option value="none">No venue</option>
            </select>
          </div>
        )}

        <div>
          <p className="label-mono mb-2">Flyer (4:5 image)</p>
          {flyerPreview && (
            <div
              className="rounded-md overflow-hidden border border-line mb-2"
              style={{ aspectRatio: "4 / 5", maxWidth: 200 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flyerPreview}
                alt="Flyer preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <input
            id="flyer-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFile}
            className="input-dark file:mr-3 file:bg-s3 file:text-cream file:border-0 file:rounded file:px-3 file:py-1 file:text-xs"
          />
          <p className="label-mono mt-2">Or paste a URL instead:</p>
          <input
            id="flyer-url"
            type="url"
            value={flyerUrl}
            onChange={(e) => setFlyerUrl(e.target.value)}
            className="input-dark mt-1"
            placeholder="https://…"
          />
        </div>

        <div>
          <label htmlFor="description" className="label-mono block mb-2">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-dark min-h-[80px]"
            placeholder="Guest list open 10–midnight…"
          />
        </div>

        <div>
          <p className="label-mono mb-2">Nights</p>
          <div className="flex flex-col gap-3">
            {nights.map((n, i) => (
              <div key={n.key} className="card">
                <div className="flex items-center justify-between mb-3">
                  <p className="label-mono">Night {i + 1}</p>
                  {nights.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNight(i)}
                      className="label-mono text-coral hover:brightness-125"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={n.date}
                    onChange={(e) => updateNight(i, { date: e.target.value })}
                    className="input-dark"
                    required
                  />
                  <input
                    type="time"
                    value={n.time}
                    onChange={(e) => updateNight(i, { time: e.target.value })}
                    className="input-dark"
                    required
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  value={n.capacity}
                  onChange={(e) => updateNight(i, { capacity: e.target.value })}
                  className="input-dark mt-2"
                  placeholder={
                    defaultCapacity
                      ? `Capacity (default ${defaultCapacity})`
                      : "Capacity"
                  }
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setNights((r) => [...r, newNight()])}
            className="btn-ghost mt-3"
          >
            + Add night
          </button>
        </div>

        {error && <p className="text-coral text-sm">{error}</p>}

        <button type="submit" className="btn-primary mt-4" disabled={pending}>
          {pending ? "Creating…" : "Create event"}
        </button>
      </form>
    </main>
  );
}
