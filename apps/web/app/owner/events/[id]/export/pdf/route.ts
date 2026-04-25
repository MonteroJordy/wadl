import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRosterPdf, type PdfGroup } from "@/lib/pdf";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PdfGuest {
  id: string;
  full_name: string;
  plus_ones: number;
  tier: string;
  flag_dna: boolean;
  allocation: { holder_name: string } | null;
  night: { id: string; night_date: string; doors_at: string };
  check_ins: Array<{ state: string }>;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account:accounts!inner(owner_user_id), venue:venues(name, city)")
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      account: { owner_user_id: string };
      venue: { name: string | null; city: string | null } | null;
    }>();
  if (!event || event.account.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const nightFilter = url.searchParams.get("night");

  const admin = createAdminClient();
  const { data: nights } = await admin
    .from("event_nights")
    .select("id, night_date, doors_at")
    .eq("event_id", event.id)
    .order("doors_at");
  const allNights = (nights ?? []) as Array<{
    id: string;
    night_date: string;
    doors_at: string;
  }>;
  const targetIds = nightFilter ? [nightFilter] : allNights.map((n) => n.id);
  const showAllNights = !nightFilter;
  const activeNight = allNights.find((n) => n.id === nightFilter) ?? null;

  let guests: PdfGuest[] = [];
  if (targetIds.length > 0) {
    const { data } = await admin
      .from("guests")
      .select(
        "id, full_name, plus_ones, tier, flag_dna, " +
          "allocation:allocations(holder_name), " +
          "night:event_nights!inner(id, night_date, doors_at), " +
          "check_ins(state)"
      )
      .in("event_night_id", targetIds)
      .eq("status", "approved")
      .order("full_name");
    guests = (data ?? []) as unknown as PdfGuest[];
  }

  const groupMap = new Map<string, PdfGuest[]>();
  for (const g of guests) {
    const key = g.allocation?.holder_name ?? "Walk-up / direct";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(g);
  }
  const groups: PdfGroup[] = [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([holder_name, list]) => ({
      holder_name,
      rows: list.map((g) => ({
        scanned: g.check_ins.some((c) => c.state === "approved"),
        full_name: g.full_name,
        tier: g.tier,
        plus_ones: g.plus_ones,
        flag_dna: g.flag_dna,
        night_label: showAllNights ? fmtDate(g.night.night_date) : undefined,
      })),
    }));

  const total = guests.reduce((s, g) => s + 1 + (g.plus_ones ?? 0), 0);
  const subtitle = activeNight
    ? `${fmtDate(activeNight.night_date)} | Doors ${fmtTime(activeNight.doors_at)} | ${guests.length} approved | ${total} heads${event.venue?.name ? " | " + event.venue.name : ""}`
    : `${allNights.length} nights | ${guests.length} approved | ${total} heads${event.venue?.name ? " | " + event.venue.name : ""}`;

  const pdf = generateRosterPdf({
    title: event.name,
    subtitle,
    groups,
  });

  const filename = `${event.name.replace(/[^a-z0-9-_]+/gi, "_")}_roster.pdf`;
  const body = Buffer.from(pdf);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
