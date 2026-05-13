"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/wadl";
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

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--w-surface-1)",
  border: "1px solid var(--w-line)",
  color: "var(--w-fg)",
  padding: "10px 12px",
  fontFamily: "var(--w-sans)",
  fontSize: 14,
};

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
  const [flyerPreview, setFlyerPreview] = useState<string | null>(
    initial.flyer_url || null,
  );
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
    setNights((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
      <form
        onSubmit={onSaveEvent}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div>
          <label
            htmlFor="name"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 6 }}
          >
            EVENT NAME
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={INPUT_STYLE}
            required
          />
        </div>

        <div>
          <div className="w-type-meta" style={{ marginBottom: 6 }}>
            FLYER (4:5 IMAGE)
          </div>
          {flyerPreview && (
            <div
              style={{
                overflow: "hidden",
                border: "1px solid var(--w-line)",
                marginBottom: 8,
                aspectRatio: "4 / 5",
                maxWidth: 200,
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
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFile}
            style={INPUT_STYLE}
          />
          <div
            className="w-type-meta"
            style={{ marginTop: 8, marginBottom: 4 }}
          >
            OR PASTE A URL:
          </div>
          <input
            type="url"
            value={flyerUrl}
            onChange={(e) => setFlyerUrl(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="w-type-meta"
            style={{ display: "block", marginBottom: 6 }}
          >
            DESCRIPTION
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...INPUT_STYLE, minHeight: 80 }}
          />
        </div>

        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save event"}
        </Button>
      </form>

      <div
        style={{
          margin: "32px 0",
          height: 1,
          background: "var(--w-line)",
        }}
      />

      <form
        onSubmit={onSaveNights}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div className="w-type-meta">NIGHTS</div>
        {nights.map((n) => (
          <div key={n.id} className="w-card" style={{ padding: 14 }}>
            <div className="w-type-meta" style={{ marginBottom: 8 }}>
              {fmtDate(n.night_date).toUpperCase()}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div>
                <label
                  htmlFor={`doors-${n.id}`}
                  className="w-type-meta"
                  style={{ display: "block", marginBottom: 4 }}
                >
                  DOORS
                </label>
                <input
                  id={`doors-${n.id}`}
                  type="datetime-local"
                  defaultValue={toLocalDateTimeInputValue(n.doors_at)}
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label
                  htmlFor={`cutoff-${n.id}`}
                  className="w-type-meta"
                  style={{ display: "block", marginBottom: 4 }}
                >
                  RSVP CUTOFF
                </label>
                <input
                  id={`cutoff-${n.id}`}
                  type="datetime-local"
                  defaultValue={toLocalDateTimeInputValue(n.cutoff_at)}
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <div
                  className="w-type-meta"
                  style={{ marginBottom: 4 }}
                >
                  CAPACITY CAP
                </div>
                <input
                  type="number"
                  min={0}
                  value={n.capacity_cap ?? ""}
                  onChange={(e) =>
                    updateNight(n.id, {
                      capacity_cap: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <div
                  className="w-type-meta"
                  style={{ marginBottom: 4 }}
                >
                  LOCKDOWN %
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={n.lockdown_threshold_pct}
                  onChange={(e) =>
                    updateNight(n.id, {
                      lockdown_threshold_pct:
                        parseInt(e.target.value, 10) || 100,
                    })
                  }
                  style={INPUT_STYLE}
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save nights"}
        </Button>
      </form>

      {error && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginTop: 16 }}
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-ok)", marginTop: 16 }}
        >
          {saved}
        </p>
      )}
    </>
  );
}
