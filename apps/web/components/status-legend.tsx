"use client";

import { useState } from "react";

interface LegendEntry {
  swatch: string; // CSS color
  label: string;
  description?: string;
}

const SCAN_STATUSES: LegendEntry[] = [
  {
    swatch: "var(--w-ok)",
    label: "APPROVED",
    description: "First scan in. Let them through.",
  },
  {
    swatch: "var(--w-warn)",
    label: "ALREADY IN",
    description: "Same QR scanned twice. Wave them through.",
  },
  {
    swatch: "var(--w-err)",
    label: "DENIED",
    description: "Flagged, revoked, or wrong event. Hold them.",
  },
  {
    swatch: "var(--w-fg-muted)",
    label: "PENDING",
    description: "Manual review needed. Tap the queue.",
  },
];

const RSVP_STATUSES: LegendEntry[] = [
  {
    swatch: "var(--w-ok)",
    label: "APPROVED",
    description: "On the list. Counts toward capacity.",
  },
  {
    swatch: "var(--w-warn)",
    label: "PENDING",
    description: "Waiting for your call. Visit the queue.",
  },
  {
    swatch: "var(--w-fg-muted)",
    label: "WAITLIST",
    description: "Auto-promotes when a confirmed guest cancels.",
  },
  {
    swatch: "var(--w-err)",
    label: "REJECTED",
    description: "You said no. Won't scan in.",
  },
];

interface Props {
  /** Which legend set to show. "scan" for door, "rsvp" for queue/list. */
  kind?: "scan" | "rsvp";
  /** Inline (always visible) vs collapsible (button toggle). */
  variant?: "inline" | "collapsible";
}

/**
 * Color-coded status key. Always visible on the door scanner (where
 * staff need instant lookup), collapsible elsewhere to save space.
 */
export default function StatusLegend({
  kind = "scan",
  variant = "collapsible",
}: Props) {
  const [open, setOpen] = useState(variant === "inline");
  const entries = kind === "scan" ? SCAN_STATUSES : RSVP_STATUSES;

  if (variant === "collapsible") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-type-meta"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--w-fg-muted)",
            cursor: "pointer",
            padding: "8px 0",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          STATUS KEY
        </button>
        {open && <Body entries={entries} />}
      </div>
    );
  }

  return <Body entries={entries} />;
}

function Body({ entries }: { entries: LegendEntry[] }) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: "8px 0 0",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {entries.map((e) => (
        <li
          key={e.label}
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto 1fr",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              background: e.swatch,
              borderRadius: 2,
            }}
          />
          <span
            className="w-type-meta"
            style={{ color: "var(--w-fg)" }}
          >
            {e.label}
          </span>
          {e.description && (
            <span
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                fontSize: 12,
              }}
            >
              {e.description}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
