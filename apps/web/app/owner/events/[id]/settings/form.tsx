"use client";

import { useState, useTransition } from "react";
import { updateEventAction, updateNightsAction } from "./actions";
import { fmtDate } from "@/lib/format";

interface NightRow {
  id: string;
  night_date: string;
  doors_at: string;
  cutoff_at: string | null;
  capacity_cap: number | null;
  lockdown_threshold_pct: number;
}

function toLocalDateTimeInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function SettingsForm({
  eventId,
  initial,
  nights: initialNights,
}: {
  eventId: string;
  initial: { name: string; description: string; flyer_url: string };
  nights: NightRow[];
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [flyerUrl, setFlyerUrl] = useState(initial.flyer_url);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(initial.flyer_url || null);
  const [nights, setNights] = useState<NightRow[]>(initialNights);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFlyerFile(f);
    if (f) setFlyerPreview(URL.createObjectURL(f));
  }

  function updateNight(id: string, patch: Partial<NightRow>) {
    setNights((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function onSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("flyer_url", flyerUrl);
    if (flyerFile) fd.set("flyer_file", flyerFile);

    startTransition(async () => {
      const res = await updateEventAction(eventId, fd);
      if (res?.error) setError(res.error);
      else {
        setSaved("Event saved.");
        if (res?.flyerUrl) {
          setFlyerUrl(res.flyerUrl);
          setFlyerPreview(res.flyerUrl);
          setFlyerFile(null);
        }
      }
    });
  }

  function onSaveNights(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    const patches = nights.map((n) => {
      const doorsLocal = (document.getElementById(`doors-${n.id}`) as HTMLInputElement)?.value;
      const cutoffLocal = (document.getElementById(`cutoff-${n.id}`) as HTMLInputElement)?.value;
      return {
        id: n.id,
        doors_at: doorsLocal ? new Date(doorsLocal).toISOString() : n.doors_at,
        cutoff_at: cutoffLocal ? new Date(cutoffLocal).toISOString() : null,
        capacity_cap: n.capacity_cap,
        lockdown_threshold_pct: n.lockdown_threshold_pct,
      };
    });

    startTransition(async () => {
      const res = await updateNightsAction(eventId, patches);
      if (res?.error) setError(res.error);
      else setSaved("Nights saved.");
    });
  }

  return (
    <>
      <form onSubmit={onSaveEvent} className="flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="label-mono block mb-2">Event name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark"
            required
          />
        </div>

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
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFile}
            className="input-dark file:mr-3 file:bg-s3 file:text-cream file:border-0 file:rounded file:px-3 file:py-1 file:text-xs"
          />
          <p className="label-mono mt-2">Or paste a URL:</p>
          <input
            type="url"
            value={flyerUrl}
            onChange={(e) => setFlyerUrl(e.target.value)}
            className="input-dark mt-1"
          />
        </div>

        <div>
          <label htmlFor="description" className="label-mono block mb-2">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-dark min-h-[80px]"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save event"}
        </button>
      </form>

      <div className="my-8 h-px bg-line" />

      <form onSubmit={onSaveNights} className="flex flex-col gap-4">
        <p className="label-mono">Nights</p>
        {nights.map((n) => (
          <div key={n.id} className="card">
            <p className="label-mono mb-2">{fmtDate(n.night_date)}</p>
            <div className="flex flex-col gap-2">
              <div>
                <label htmlFor={`doors-${n.id}`} className="label-mono block mb-1">Doors</label>
                <input
                  id={`doors-${n.id}`}
                  type="datetime-local"
                  defaultValue={toLocalDateTimeInputValue(n.doors_at)}
                  className="input-dark"
                />
              </div>
              <div>
                <label htmlFor={`cutoff-${n.id}`} className="label-mono block mb-1">RSVP cutoff</label>
                <input
                  id={`cutoff-${n.id}`}
                  type="datetime-local"
                  defaultValue={toLocalDateTimeInputValue(n.cutoff_at)}
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-mono block mb-1">Capacity cap</label>
                <input
                  type="number"
                  min={0}
                  value={n.capacity_cap ?? ""}
                  onChange={(e) =>
                    updateNight(n.id, {
                      capacity_cap: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-mono block mb-1">Lockdown %</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={n.lockdown_threshold_pct}
                  onChange={(e) =>
                    updateNight(n.id, {
                      lockdown_threshold_pct: parseInt(e.target.value, 10) || 100,
                    })
                  }
                  className="input-dark"
                />
              </div>
            </div>
          </div>
        ))}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save nights"}
        </button>
      </form>

      {error && <p className="text-err text-sm mt-4">{error}</p>}
      {saved && <p className="text-mint text-sm mt-4">{saved}</p>}
    </>
  );
}
