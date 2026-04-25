import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import EmbedRsvpForm from "./embed-form";

export const dynamic = "force-dynamic";

const DEFAULT_ACCENT = "#FF4A2B";

function isHexColor(s: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(s);
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams: { accent?: string };
}) {
  const accent = (() => {
    const raw = searchParams.accent ?? "";
    if (!raw) return DEFAULT_ACCENT;
    const cleaned = raw.startsWith("#") ? raw : `#${raw}`;
    return isHexColor(cleaned) ? cleaned : DEFAULT_ACCENT;
  })();

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select(
      "id, name, event_nights(id, doors_at, night_date)"
    )
    .eq("id", params.eventId)
    .maybeSingle<{
      id: string;
      name: string;
      event_nights: Array<{ id: string; doors_at: string; night_date: string }>;
    }>();
  if (!ev) notFound();

  const now = Date.now();
  const upcoming = ev.event_nights
    .filter((n) => new Date(n.doors_at).getTime() >= now)
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))[0];

  return (
    <div
      style={{
        margin: "0 auto",
        maxWidth: 360,
        padding: 16,
        color: "#F2EDE4",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          padding: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          backgroundColor: "rgba(10,10,10,0.7)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.5,
            margin: 0,
          }}
        >
          RSVP
        </p>
        <h2 style={{ fontSize: 22, margin: "4px 0 4px 0", color: "#F2EDE4" }}>
          {ev.name}
        </h2>
        {upcoming && (
          <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 16px" }}>
            {fmtDate(upcoming.night_date)} · Doors {fmtTime(upcoming.doors_at)}
          </p>
        )}
        {!upcoming ? (
          <p style={{ opacity: 0.7 }}>No upcoming nights.</p>
        ) : (
          <EmbedRsvpForm eventId={ev.id} accent={accent} />
        )}
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.4,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Powered by WADL
        </p>
      </div>
    </div>
  );
}
