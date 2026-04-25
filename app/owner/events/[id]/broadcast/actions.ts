"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { notify } from "@/lib/notifications";
import { renderTemplate } from "@/lib/sms-templates";

export interface BroadcastFilter {
  night_id?: string | null;
  status?: "approved" | "pending" | "all";
  tier?: "ga" | "vip" | "all_access" | "all";
  allocation_id?: string | null;
}

export async function previewBroadcastAction(
  eventId: string,
  filter: BroadcastFilter
): Promise<
  | { ok: true; recipientCount: number; estimatedCost: number }
  | { ok: false; error: string }
> {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, account_id")
    .eq("id", eventId)
    .maybeSingle<{ id: string; account_id: string }>();
  if (!ev || ev.account_id !== account.id)
    return { ok: false, error: "Not authorized." };

  const { data: nights } = await admin
    .from("event_nights")
    .select("id")
    .eq("event_id", eventId);
  const allNightIds = ((nights ?? []) as Array<{ id: string }>).map((n) => n.id);
  const targetNightIds = filter.night_id ? [filter.night_id] : allNightIds;
  if (targetNightIds.length === 0)
    return { ok: true, recipientCount: 0, estimatedCost: 0 };

  let q = admin
    .from("guests")
    .select("phone, status, tier, allocation_id")
    .in("event_night_id", targetNightIds)
    .not("phone", "is", null);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter.tier && filter.tier !== "all") q = q.eq("tier", filter.tier);
  if (filter.allocation_id) q = q.eq("allocation_id", filter.allocation_id);

  const { data: rows } = await q;
  const phones = new Set(
    ((rows ?? []) as Array<{ phone: string | null }>)
      .map((r) => r.phone)
      .filter(Boolean) as string[]
  );
  const recipientCount = phones.size;
  // ~$0.0079/segment (US Twilio) — round up.
  const estimatedCost = +(recipientCount * 0.008).toFixed(2);
  return { ok: true, recipientCount, estimatedCost };
}

export async function sendBroadcastAction(
  eventId: string,
  filter: BroadcastFilter,
  body: string
): Promise<
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string }
> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Body is empty." };
  if (trimmed.length > 320) return { ok: false, error: "Body too long (>320)." };

  const { account, profile } = await requireOwnerContext();
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, account_id, name, venue:venues(name)")
    .eq("id", eventId)
    .maybeSingle<{
      id: string;
      account_id: string;
      name: string;
      venue: { name: string | null } | null;
    }>();
  if (!ev || ev.account_id !== account.id)
    return { ok: false, error: "Not authorized." };

  const { data: nights } = await admin
    .from("event_nights")
    .select("id, night_date")
    .eq("event_id", eventId);
  const allNights = (nights ?? []) as Array<{ id: string; night_date: string }>;
  const targetNightIds = filter.night_id ? [filter.night_id] : allNights.map((n) => n.id);
  const nightDateById = new Map(allNights.map((n) => [n.id, n.night_date]));

  let q = admin
    .from("guests")
    .select("id, full_name, phone, status, tier, allocation_id, event_night_id")
    .in("event_night_id", targetNightIds)
    .not("phone", "is", null);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter.tier && filter.tier !== "all") q = q.eq("tier", filter.tier);
  if (filter.allocation_id) q = q.eq("allocation_id", filter.allocation_id);

  const { data: rows } = await q;
  const guests = (rows ?? []) as Array<{
    id: string;
    full_name: string;
    phone: string;
    event_night_id: string;
  }>;

  // Dedupe by phone across the result set (keep first guest seen).
  const byPhone = new Map<string, (typeof guests)[number]>();
  for (const g of guests) if (!byPhone.has(g.phone)) byPhone.set(g.phone, g);

  let sent = 0;
  let failed = 0;
  for (const g of byPhone.values()) {
    const nightDate = nightDateById.get(g.event_night_id) ?? "";
    const body = renderTemplate(trimmed, {
      "guest.name": g.full_name,
      "event.name": ev.name,
      "event.date": nightDate,
      "venue.name": ev.venue?.name ?? "",
    });
    const r = await sendSms({ to: g.phone, body });
    if (r.ok) sent++;
    else failed++;
  }

  await admin.from("broadcasts").insert({
    event_id: eventId,
    account_id: account.id,
    sent_by: profile.id,
    body: trimmed,
    filters: filter as unknown as Record<string, unknown>,
    recipient_count: sent,
  });

  await admin.from("audit_log").insert({
    actor_user_id: profile.id,
    action: "broadcast.sms",
    entity_type: "event",
    entity_id: eventId,
    event_id: eventId,
    context: { sent, failed, filter },
  });

  await notify(account.id, "broadcast_sent", {
    message: `Sent SMS to ${sent} guest${sent === 1 ? "" : "s"} for ${ev.name}${failed ? ` (${failed} failed)` : ""}`,
    href: `/owner/events/${eventId}`,
    event_id: eventId,
  });

  revalidatePath(`/owner/events/${eventId}`);
  return { ok: true, sent, failed };
}
