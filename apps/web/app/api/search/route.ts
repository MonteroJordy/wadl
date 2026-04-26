import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface SearchHit {
  kind: "event" | "guest" | "allocation" | "audit" | "nav" | "sms";
  href: string;
  title: string;
  subtitle?: string;
}

// Quick-nav targets — typing "scor" jumps to /owner/scorecards.
const NAV_HITS: SearchHit[] = [
  { kind: "nav", href: "/owner", title: "This week", subtitle: "Owner home" },
  { kind: "nav", href: "/owner/calendar", title: "Calendar", subtitle: "All events" },
  { kind: "nav", href: "/owner/holders", title: "Holders", subtitle: "Cross-event roster" },
  { kind: "nav", href: "/owner/scorecards", title: "Scorecards", subtitle: "Holder show rates" },
  { kind: "nav", href: "/owner/analytics", title: "Analytics", subtitle: "Charts + retention" },
  { kind: "nav", href: "/owner/flags", title: "Flag list", subtitle: "Do-not-admit" },
  { kind: "nav", href: "/owner/notifications", title: "Notifications", subtitle: "Inbox" },
  { kind: "nav", href: "/owner/sms-log", title: "SMS log", subtitle: "Outbound delivery" },
  { kind: "nav", href: "/owner/sms-templates", title: "SMS templates", subtitle: "Saved copy" },
  { kind: "nav", href: "/owner/payouts", title: "Payouts", subtitle: "Stripe Connect" },
  { kind: "nav", href: "/owner/billing", title: "Billing", subtitle: "Subscription" },
  { kind: "nav", href: "/owner/profile", title: "Profile + venues", subtitle: "Account" },
  { kind: "nav", href: "/owner/profile/notifications", title: "Notification prefs", subtitle: "Quiet hours, channels" },
  { kind: "nav", href: "/owner/webhooks", title: "Webhooks", subtitle: "Outbound endpoints" },
  { kind: "nav", href: "/help", title: "Help", subtitle: "8 most common door issues" },
  { kind: "nav", href: "/contact", title: "Contact founder", subtitle: "Email or text" },
  { kind: "nav", href: "/owner/events/new", title: "+ New event", subtitle: "Create" },
  { kind: "nav", href: "/door", title: "Door view", subtitle: "Switch context" },
  { kind: "nav", href: "/manager", title: "Manager view", subtitle: "Switch context" },
];

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, hits: [] });
  }

  // Resolve account.
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id, email")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null; email: string | null }>();
  const accountId = profile?.account_id;
  if (!accountId) return NextResponse.json({ ok: true, hits: [] });

  const admin = createAdminClient();
  const like = `%${q}%`;
  const qLower = q.toLowerCase();
  const hits: SearchHit[] = [];

  // Quick-nav hits surface first when matching by title or subtitle.
  for (const n of NAV_HITS) {
    if (
      n.title.toLowerCase().includes(qLower) ||
      n.subtitle?.toLowerCase().includes(qLower)
    ) {
      hits.push(n);
    }
  }

  // Events scoped to account.
  const { data: events } = await admin
    .from("events")
    .select("id, name, venue:venues(name)")
    .eq("account_id", accountId)
    .ilike("name", like)
    .limit(8);
  for (const e of (events ?? []) as unknown as Array<{
    id: string;
    name: string;
    venue: { name: string | null } | null;
  }>) {
    hits.push({
      kind: "event",
      href: `/owner/events/${e.id}`,
      title: e.name,
      subtitle: e.venue?.name ? `Event · ${e.venue.name}` : "Event",
    });
  }

  // Guests scoped to events of this account.
  const { data: eventIdsRaw } = await admin
    .from("events")
    .select("id")
    .eq("account_id", accountId);
  const eventIds = ((eventIdsRaw ?? []) as Array<{ id: string }>).map((e) => e.id);
  if (eventIds.length > 0) {
    const { data: nights } = await admin
      .from("event_nights")
      .select("id, event_id, event:events!inner(name)")
      .in("event_id", eventIds);
    const nightToEvent = new Map<string, { id: string; name: string }>();
    for (const n of (nights ?? []) as unknown as Array<{
      id: string;
      event_id: string;
      event: { name: string };
    }>) {
      nightToEvent.set(n.id, { id: n.event_id, name: n.event.name });
    }
    const nightIds = [...nightToEvent.keys()];
    if (nightIds.length > 0) {
      const { data: guests } = await admin
        .from("guests")
        .select("id, full_name, phone, event_night_id")
        .in("event_night_id", nightIds)
        .ilike("full_name", like)
        .limit(8);
      for (const g of (guests ?? []) as Array<{
        id: string;
        full_name: string;
        phone: string | null;
        event_night_id: string;
      }>) {
        const ev = nightToEvent.get(g.event_night_id);
        if (!ev) continue;
        hits.push({
          kind: "guest",
          href: `/owner/events/${ev.id}/guests/${g.id}`,
          title: g.full_name,
          subtitle: `Guest · ${ev.name}${g.phone ? ` · ${g.phone}` : ""}`,
        });
      }

      const { data: allocs } = await admin
        .from("allocations")
        .select("id, holder_name, event_night_id")
        .in("event_night_id", nightIds)
        .ilike("holder_name", like)
        .limit(8);
      for (const a of (allocs ?? []) as Array<{
        id: string;
        holder_name: string;
        event_night_id: string;
      }>) {
        const ev = nightToEvent.get(a.event_night_id);
        if (!ev) continue;
        hits.push({
          kind: "allocation",
          href: `/owner/events/${ev.id}/allocations/${a.id}`,
          title: a.holder_name,
          subtitle: `Allocation · ${ev.name}`,
        });
      }
    }
  }

  // SMS log — by phone or template_key.
  const { data: smsRows } = await admin
    .from("sms_log")
    .select("id, to_phone, template_key, body, created_at, status")
    .eq("account_id", accountId)
    .or(`to_phone.ilike.${like},template_key.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(6);
  for (const r of (smsRows ?? []) as Array<{
    id: string;
    to_phone: string;
    template_key: string | null;
    body: string;
    created_at: string;
    status: string;
  }>) {
    hits.push({
      kind: "sms",
      href: `/owner/sms-log?status=${r.status}`,
      title: r.to_phone,
      subtitle: `SMS · ${r.template_key ?? "broadcast"} · ${r.status} · ${new Date(r.created_at).toLocaleDateString()}`,
    });
  }

  return NextResponse.json({ ok: true, hits: hits.slice(0, 30) });
}
