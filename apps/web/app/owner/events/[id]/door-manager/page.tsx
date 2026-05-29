import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import {
  Breadcrumb,
  EventSubNav,
  PageHeader,
  Stat,
} from "@/components/v5";
import DoorManagerClient from "./manager-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function DoorManagerPage({ params }: PageProps) {
  const { supabase } = await requireOwnerContext();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev) notFound();

  // Pick the most relevant night: today's, else the soonest upcoming.
  const { data: nights } = await supabase
    .from("event_nights")
    .select("id, night_date, doors_at, capacity_cap")
    .eq("event_id", params.id)
    .order("night_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const liveNight =
    nights?.find((n) => n.night_date === today) ?? nights?.[0] ?? null;
  if (!liveNight) {
    return (
      <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <Breadcrumb items={[["Events", "/owner"], ev.name, "Door"]} />
        <EventSubNav active="door" eventId={params.id} />
        <PageHeader eyebrow={ev.name} title="Door manager" sub="No nights scheduled yet." />
      </main>
    );
  }

  const [{ data: guests }, { count: scanned }, { count: noShows }, { count: walkIns }] =
    await Promise.all([
      supabase
        .from("guests")
        .select("id, full_name, phone, tier, status, added_by_user_id, created_at, approved_at")
        .eq("event_night_id", liveNight.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_night_id", liveNight.id),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("event_night_id", liveNight.id)
        .eq("status", "no_show"),
      supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("event_night_id", liveNight.id)
        .eq("method", "walk_in"),
    ]);

  const onListCount = (guests ?? []).length;
  const remaining = (liveNight.capacity_cap ?? 0) - (scanned ?? 0);
  const isLive =
    new Date(liveNight.doors_at).getTime() - Date.now() < 1000 * 60 * 60 * 6;

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Breadcrumb items={[["Events", "/owner"], ev.name, "Door"]} />
      <EventSubNav active="door" eventId={params.id} />
      <PageHeader
        eyebrow={`${ev.name} · ${liveNight.night_date}${isLive ? " · live" : ""}`}
        title="Door manager"
        sub="Walk-ins, credential changes, no-shows. Permission tier above scanner."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat label="In" value={String(scanned ?? 0)} sub={`of ${liveNight.capacity_cap ?? "—"}`} />
        <Stat
          label="Pending"
          value={String(Math.max(0, onListCount - (scanned ?? 0)))}
          sub={`of ${onListCount} on list`}
        />
        <Stat label="No-shows" value={String(noShows ?? 0)} sub="manual flag" />
        <Stat
          label="Walk-ins"
          value={String(walkIns ?? 0)}
          sub={remaining > 0 ? `${remaining} cap left` : "at cap"}
          last
        />
      </div>

      <DoorManagerClient
        eventId={params.id}
        nightId={liveNight.id}
        guests={(guests ?? []).map((g) => ({
          id: g.id,
          full_name: g.full_name,
          phone: g.phone,
          tier: g.tier as "ga" | "vip" | "aaa",
          status: g.status as
            | "pending"
            | "approved"
            | "declined"
            | "no_show",
          checked_in: false, // computed best-effort client-side
        }))}
      />
    </main>
  );
}
