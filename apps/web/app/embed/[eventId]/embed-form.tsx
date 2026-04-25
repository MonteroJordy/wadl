"use client";

import { useState, useTransition } from "react";
import { embedRsvpAction } from "./actions";

export default function EmbedRsvpForm({
  eventId,
  accent,
}: {
  eventId: string;
  accent: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plus, setPlus] = useState("0");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await embedRsvpAction({
        eventId,
        full_name: name,
        phone,
        plus_ones: parseInt(plus, 10) || 0,
      });
      if (res.ok) setDone(true);
      else setErr(res.error);
    });
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="font-display text-2xl mb-2" style={{ color: accent }}>
          You&apos;re on the list.
        </p>
        <p className="text-sm" style={{ opacity: 0.7 }}>
          We&apos;ll text your QR after the host approves.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="w-full px-3 py-3 rounded border bg-transparent"
        style={{ borderColor: "rgba(255,255,255,0.15)", color: "inherit" }}
        required
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        placeholder="Phone (10 digits)"
        className="w-full px-3 py-3 rounded border bg-transparent"
        style={{ borderColor: "rgba(255,255,255,0.15)", color: "inherit" }}
        required
      />
      <input
        value={plus}
        onChange={(e) => setPlus(e.target.value.replace(/[^\d]/g, ""))}
        type="text"
        inputMode="numeric"
        placeholder="+1s (optional)"
        className="w-full px-3 py-3 rounded border bg-transparent"
        style={{ borderColor: "rgba(255,255,255,0.15)", color: "inherit" }}
      />
      {err && (
        <p className="text-sm" style={{ color: "#ff6b6b" }}>
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded font-semibold text-sm uppercase tracking-wider"
        style={{ backgroundColor: accent, color: "#0a0a0a" }}
      >
        {pending ? "Sending…" : "RSVP"}
      </button>
    </form>
  );
}
