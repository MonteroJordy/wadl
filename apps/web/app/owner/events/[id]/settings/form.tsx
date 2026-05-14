"use client";

import { useState, useTransition } from "react";
import { PageHeader, EventSubNav, Cover } from "@/components/v5";
import { useFormSaveShortcut } from "@/components/use-form-save-shortcut";
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
  eventName,
  initial,
  nights: initialNights,
}: {
  eventId: string;
  eventName: string;
  initial: { name: string; description: string; flyer_url: string };
  nights: NightRow[];
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [flyerUrl, setFlyerUrl] = useState(initial.flyer_url);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(
    initial.flyer_url || null,
  );
  const [nights, setNights] = useState<NightRow[]>(initialNights);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const eventFormRef = useFormSaveShortcut();
  const nightsFormRef = useFormSaveShortcut();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFlyerFile(f);
    if (f) setFlyerPreview(URL.createObjectURL(f));
  }

  function updateNight(id: string, patch: Partial<NightRow>) {
    setNights((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function onDiscard() {
    setName(initial.name);
    setDescription(initial.description);
    setFlyerUrl(initial.flyer_url);
    setFlyerFile(null);
    setFlyerPreview(initial.flyer_url || null);
    setNights(initialNights);
    setError(null);
    setSaved(null);
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
      const doorsLocal = (
        document.getElementById(`doors-${n.id}`) as HTMLInputElement
      )?.value;
      const cutoffLocal = (
        document.getElementById(`cutoff-${n.id}`) as HTMLInputElement
      )?.value;
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
      <PageHeader
        eyebrow="Edit this event"
        title="Settings"
        actions={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onDiscard}
              disabled={pending}
            >
              Discard
            </button>
            <button
              type="submit"
              form="event-basics-form"
              className="btn"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        }
      />
      <EventSubNav active="settings" eventId={eventId} />

      <div style={{ padding: "var(--s-8)" }}>
        {/* Basics */}
        <div className="t-meta">Basics</div>
        <form
          id="event-basics-form"
          ref={eventFormRef}
          onSubmit={onSaveEvent}
          style={{
            marginTop: "var(--s-4)",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--s-5)",
            maxWidth: 720,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="t-meta">Event name</div>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginTop: "var(--s-2)" }}
              required
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="t-meta">Description</div>
            <textarea
              id="description"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ marginTop: "var(--s-2)", minHeight: 80 }}
            />
          </div>
        </form>

        {/* Cover image */}
        <div className="t-meta" style={{ marginTop: "var(--s-10)" }}>
          Cover image
        </div>
        <div
          className="card"
          style={{
            marginTop: "var(--s-3)",
            padding: "var(--s-4)",
            display: "flex",
            gap: "var(--s-4)",
            alignItems: "center",
            maxWidth: 720,
          }}
        >
          <div style={{ width: 160 }}>
            {flyerPreview ? (
              <div
                style={{
                  width: "100%",
                  height: 100,
                  borderRadius: "var(--r-lg)",
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
              </div>
            ) : (
              <Cover seed={eventName} height={100} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="t-h1">
              {flyerPreview ? "Cover image" : "Generated cover"}
            </div>
            <div className="t-body-2" style={{ marginTop: "var(--s-1)" }}>
              Used everywhere this event appears.
            </div>
            <div
              style={{
                display: "flex",
                gap: "var(--s-2)",
                marginTop: "var(--s-3)",
                flexWrap: "wrap",
              }}
            >
              <label
                className="btn btn--secondary btn--sm"
                style={{ cursor: "pointer" }}
              >
                Upload image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPickFile}
                  style={{ display: "none" }}
                />
              </label>
              {flyerPreview && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setFlyerUrl("");
                    setFlyerFile(null);
                    setFlyerPreview(null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            <div style={{ marginTop: "var(--s-3)" }}>
              <div className="t-meta">Or paste a URL</div>
              <input
                type="url"
                className="input"
                value={flyerUrl}
                onChange={(e) => {
                  setFlyerUrl(e.target.value);
                  setFlyerPreview(e.target.value || null);
                }}
                style={{ marginTop: "var(--s-2)" }}
              />
            </div>
          </div>
        </div>

        {/* Nights */}
        <div className="t-meta" style={{ marginTop: "var(--s-10)" }}>
          Nights
        </div>
        <form
          ref={nightsFormRef}
          onSubmit={onSaveNights}
          style={{ marginTop: "var(--s-4)", maxWidth: 720 }}
        >
          {nights.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: "var(--s-5)",
                marginBottom: "var(--s-3)",
              }}
            >
              <div className="t-h2" style={{ marginBottom: "var(--s-4)" }}>
                {fmtDate(n.night_date)}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "var(--s-5)",
                }}
              >
                <div>
                  <label htmlFor={`doors-${n.id}`} className="t-meta">
                    Doors
                  </label>
                  <input
                    id={`doors-${n.id}`}
                    type="datetime-local"
                    className="input"
                    defaultValue={toLocalDateTimeInputValue(n.doors_at)}
                    style={{ marginTop: "var(--s-2)" }}
                  />
                </div>
                <div>
                  <label htmlFor={`cutoff-${n.id}`} className="t-meta">
                    RSVP cutoff
                  </label>
                  <input
                    id={`cutoff-${n.id}`}
                    type="datetime-local"
                    className="input"
                    defaultValue={toLocalDateTimeInputValue(n.cutoff_at)}
                    style={{ marginTop: "var(--s-2)" }}
                  />
                </div>
                <div>
                  <div className="t-meta">Capacity cap</div>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={n.capacity_cap ?? ""}
                    onChange={(e) =>
                      updateNight(n.id, {
                        capacity_cap: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    style={{ marginTop: "var(--s-2)" }}
                  />
                </div>
                <div>
                  <div className="t-meta">Lockdown %</div>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="input"
                    value={n.lockdown_threshold_pct}
                    onChange={(e) =>
                      updateNight(n.id, {
                        lockdown_threshold_pct:
                          parseInt(e.target.value, 10) || 100,
                      })
                    }
                    style={{ marginTop: "var(--s-2)" }}
                  />
                </div>
              </div>
            </div>
          ))}
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Saving…" : "Save nights"}
          </button>
        </form>

        {error && (
          <p
            className="t-body-2"
            style={{ color: "var(--err)", marginTop: "var(--s-5)" }}
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            className="t-body-2"
            style={{ color: "var(--ok)", marginTop: "var(--s-5)" }}
          >
            {saved}
          </p>
        )}
      </div>
    </>
  );
}
