import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import WallClient from "./wall-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Door wall — WADL" };

interface PageProps {
  params: { id: string };
}

interface TierLine {
  label: string;
  scanned: number;
  cap: number;
}

export default async function DoorWallPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/door/events/${params.id}/wall`);

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!ev) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const { data: nights } = await admin
    .from("event_nights")
    .select("id, night_date, capacity_cap")
    .eq("event_id", params.id)
    .order("night_date", { ascending: false });
  const focus =
    nights?.find((n) => n.night_date === today) ?? nights?.[0] ?? null;
  if (!focus) notFound();

  const [{ count: scanned }, { data: tierBreakdown }] = await Promise.all([
    admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("event_night_id", focus.id),
    admin
      .from("guests")
      .select("tier, plus_ones, check_ins!inner(state)")
      .eq("event_night_id", focus.id)
      .eq("check_ins.state", "approved"),
  ]);

  // Compute per-tier from approved check-ins.
  const tierAgg = new Map<string, number>();
  for (const g of tierBreakdown ?? []) {
    const k = (g.tier ?? "ga").toString();
    tierAgg.set(k, (tierAgg.get(k) ?? 0) + 1 + (g.plus_ones ?? 0));
  }

  // Per-tier caps from event.metadata if present, else even split of total.
  const totalCap = focus.capacity_cap ?? 0;
  const { data: evMeta } = await admin
    .from("events")
    .select("metadata")
    .eq("id", params.id)
    .maybeSingle();
  const tiers: TierLine[] = (() => {
    const metaTiers =
      evMeta?.metadata &&
      typeof evMeta.metadata === "object" &&
      Array.isArray((evMeta.metadata as { tiers?: unknown }).tiers)
        ? ((evMeta.metadata as { tiers: Array<{ label: string; cap: number; slug: string }> }).tiers)
        : null;
    if (metaTiers && metaTiers.length > 0) {
      return metaTiers.map((t) => ({
        label: t.label.toUpperCase(),
        scanned: tierAgg.get(t.slug) ?? tierAgg.get(t.label.toLowerCase()) ?? 0,
        cap: t.cap,
      }));
    }
    // Fallback: build from observed tiers, no caps (display as just scanned count).
    return Array.from(tierAgg.entries()).map(([slug, cnt]) => ({
      label: slug.toUpperCase(),
      scanned: cnt,
      cap: 0,
    }));
  })();

  return (
    <WallClient
      eventId={params.id}
      eventName={ev.name}
      nightId={focus.id}
      initialScanned={scanned ?? 0}
      totalCap={totalCap}
      tiers={tiers}
    />
  );
}
