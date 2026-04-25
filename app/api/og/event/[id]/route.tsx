import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

// `next/og` requires edge runtime. createAdminClient uses @supabase/supabase-js
// which is edge-compatible since it's pure fetch under the hood.
export const runtime = "edge";

interface EventForOg {
  id: string;
  name: string;
  flyer_url: string | null;
  event_nights: Array<{ doors_at: string; night_date: string }>;
  venue: { name: string | null; city: string | null } | null;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select(
      "id, name, flyer_url, event_nights(night_date, doors_at), venue:venues(name, city)"
    )
    .eq("id", params.id)
    .maybeSingle<EventForOg>();

  const event: EventForOg = data ?? {
    id: params.id,
    name: "Event",
    flyer_url: null,
    event_nights: [],
    venue: null,
  };

  const sorted = [...(event.event_nights ?? [])].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  );
  const dateLine = sorted.length
    ? sorted.length === 1
      ? fmtDate(sorted[0].night_date)
      : `${fmtDate(sorted[0].night_date)} – ${fmtDate(sorted[sorted.length - 1].night_date)}`
    : "Tonight";

  const venueLine = [event.venue?.name, event.venue?.city]
    .filter(Boolean)
    .join(" · ");

  const useFlyer = !!event.flyer_url;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        {useFlyer && event.flyer_url && (
          <div
            style={{
              width: 504, // 4:5 portrait inside 630 height
              height: "100%",
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.flyer_url}
              alt=""
              width={504}
              height={630}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#FF4A2B",
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            WADL
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 64,
                color: "#F2EDE4",
                lineHeight: 1,
                letterSpacing: 2,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {event.name.length > 60 ? event.name.slice(0, 57) + "…" : event.name}
            </div>
            <div
              style={{
                fontSize: 24,
                color: "rgba(245, 200, 66, 1)", // gold
                letterSpacing: 2,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {dateLine}
            </div>
            {venueLine && (
              <div
                style={{
                  fontSize: 22,
                  color: "rgba(242, 237, 228, 0.7)",
                  display: "flex",
                }}
              >
                {venueLine}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              color: "rgba(242, 237, 228, 0.5)",
              fontSize: 16,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            RSVP →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
