"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface EventLite {
  id: string;
  name: string;
  doors: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ComparePicker({
  side,
  events,
  current,
}: {
  side: "a" | "b";
  events: EventLite[];
  current: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <select
      defaultValue={current}
      onChange={(e) => {
        const next = new URLSearchParams(sp.toString());
        next.set(side, e.target.value);
        router.replace(`/owner/analytics/compare?${next.toString()}`);
      }}
      className="input-dark"
      aria-label={`Event ${side.toUpperCase()}`}
    >
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {fmtDate(ev.doors)} · {ev.name}
        </option>
      ))}
    </select>
  );
}
