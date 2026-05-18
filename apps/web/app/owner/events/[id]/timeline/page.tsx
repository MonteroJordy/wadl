import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import {
  Breadcrumb,
  EventSubNav,
  PageHeader,
} from "@/components/v5";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

interface TimelineRow {
  at: string;
  title: string;
  sub: string;
}

export default async function EventTimelinePage({ params }: PageProps) {
  const { supabase } = await requireOwnerContext();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev) notFound();

  const { data: nights } = await supabase
    .from("event_nights")
    .select("id, night_date, doors_at, capacity_cap")
    .eq("event_id", params.id)
    .order("night_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const focusNight =
    nights?.find((n) => n.night_date === today) ?? nights?.[0] ?? null;

  let rows: TimelineRow[] = [];
  if (focusNight) {
    const [{ data: scans }, { data: brc }] = await Promise.all([
      supabase
        .from("check_ins")
        .select("scanned_at, method, guest:guests ( full_name, tier )")
        .eq("event_night_id", focusNight.id)
        .order("scanned_at", { ascending: true })
        .limit(40),
      supabase
        .from("sms_log")
        .select("created_at, template_key")
        .eq("event_id", params.id)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    const scanRows: TimelineRow[] = (scans ?? []).map((s) => {
      const guest = Array.isArray(s.guest) ? s.guest[0] : s.guest;
      const name = guest?.full_name ?? "Guest";
      const tier = (guest?.tier ?? "GA").toString().toUpperCase();
      return {
        at: s.scanned_at,
        title: s.method === "walk_in" ? "Walk-in added" : "Check-in",
        sub: `${name} · ${tier}`,
      };
    });

    // Bucket SMS rows into broadcasts by (template_key, minute).
    type Bucket = { key: string; at: string; count: number };
    const buckets = new Map<string, Bucket>();
    for (const row of brc ?? []) {
      const minute = row.created_at.slice(0, 16);
      const key = `${row.template_key ?? "broadcast"}-${minute}`;
      const ex = buckets.get(key);
      if (ex) ex.count += 1;
      else buckets.set(key, { key, at: row.created_at, count: 1 });
    }
    const brcRows: TimelineRow[] = Array.from(buckets.values()).map((b) => ({
      at: b.at,
      title: `Broadcast`,
      sub: `${b.count} recipient${b.count === 1 ? "" : "s"}`,
    }));

    const seedRows: TimelineRow[] = [
      {
        at: focusNight.doors_at,
        title: "Doors open",
        sub: `Cap ${focusNight.capacity_cap ?? "—"}`,
      },
    ];

    rows = [...seedRows, ...scanRows, ...brcRows].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb items={[["Events", "/owner"], ev.name, "Timeline"]} />
      <EventSubNav active="timeline" eventId={params.id} />
      <PageHeader
        eyebrow={ev.name}
        title="Timeline"
        sub={
          focusNight
            ? `Every moment of ${focusNight.night_date}.`
            : "No nights scheduled yet."
        }
      />

      <div style={{ padding: "var(--s-8)" }}>
        {rows.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-8)", textAlign: "center", color: "var(--fg-3)" }}
          >
            <span className="t-body-2">No events on the timeline yet — the night hasn&apos;t started.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
            {rows.map((r, i) => (
              <div
                key={`${r.at}-${i}`}
                style={{
                  display: "flex",
                  gap: "var(--s-4)",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ width: 80, paddingTop: 4 }}>
                  <span className="t-meta">{fmtTime(r.at)}</span>
                </div>
                <div style={{ width: 14, position: "relative" }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "var(--r-pill)",
                      background: "var(--fg)",
                      border: "2px solid var(--bg)",
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                  {i < rows.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 6,
                        top: 14,
                        bottom: -28,
                        width: 2,
                        background: "var(--line)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: "var(--s-2)" }}>
                  <div className="t-h1">{r.title}</div>
                  <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                    {r.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
