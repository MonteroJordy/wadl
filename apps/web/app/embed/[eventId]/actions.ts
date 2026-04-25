"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications";
import { enqueueWebhook } from "@/lib/webhooks";
import { toE164 } from "@/lib/csv";
import { hit, LIMITS } from "@/lib/rate-limit";

interface EmbedRsvpInput {
  eventId: string;
  full_name: string;
  phone: string;
  email?: string;
  plus_ones?: number;
  tier?: "ga" | "vip" | "all_access";
}

export async function embedRsvpAction(
  input: EmbedRsvpInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullName = input.full_name?.trim();
  if (!fullName) return { ok: false, error: "Enter a name." };

  const phone = toE164(input.phone);
  if (!phone) return { ok: false, error: "Enter a valid phone number." };

  // Rate limit by IP — embeds are public, no token to scope on.
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const limit = hit(`embed:${input.eventId}:${ip}`, LIMITS.embedRsvpPerIp);
  if (!limit.ok) {
    return { ok: false, error: `Slow down — try again in ${limit.retryAfterSec}s.` };
  }

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select(
      "id, name, account_id, event_nights(id, doors_at, capacity_cap)"
    )
    .eq("id", input.eventId)
    .maybeSingle<{
      id: string;
      name: string;
      account_id: string;
      event_nights: Array<{ id: string; doors_at: string; capacity_cap: number | null }>;
    }>();
  if (!ev) return { ok: false, error: "Event not found." };

  // Pick the next upcoming night.
  const now = Date.now();
  const upcoming = ev.event_nights
    .filter((n) => new Date(n.doors_at).getTime() >= now)
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1))[0];
  if (!upcoming) return { ok: false, error: "No upcoming nights." };

  const { error } = await admin.from("guests").insert({
    event_night_id: upcoming.id,
    full_name: fullName,
    phone,
    email: input.email?.trim() || null,
    plus_ones: Math.max(0, Math.min(10, input.plus_ones ?? 0)),
    tier: input.tier ?? "ga",
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    action: "embed.rsvp_created",
    entity_type: "event",
    entity_id: ev.id,
    event_id: ev.id,
    context: { full_name: fullName, plus_ones: input.plus_ones ?? 0 },
  });

  await notify(ev.account_id, "rsvp_pending", {
    message: `${fullName} RSVP'd via embed (${ev.name})`,
    href: `/owner/events/${ev.id}/queue`,
    event_id: ev.id,
  });

  await enqueueWebhook(ev.account_id, "rsvp.created", {
    event_id: ev.id,
    via: "embed",
    full_name: fullName,
    plus_ones: input.plus_ones ?? 0,
    status: "pending",
  });

  revalidatePath(`/embed/${ev.id}`);
  return { ok: true };
}
