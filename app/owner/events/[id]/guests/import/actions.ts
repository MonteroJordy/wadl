"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/csv";

export interface ImportRow {
  full_name: string;
  phone: string | null;
  email: string | null;
  plus_ones: number;
  tier: "ga" | "vip" | "all_access";
}

export interface ImportResult {
  inserted: number;
  skipped_dupe_phone: number;
  skipped_invalid_phone: number;
  skipped_missing_name: number;
}

export async function commitImportAction(
  eventId: string,
  nightId: string,
  allocationId: string | null,
  status: "approved" | "pending",
  rows: ImportRow[]
): Promise<{ ok: true; result: ImportResult } | { ok: false; error: string }> {
  const { account, profile } = await requireOwnerContext();
  const admin = createAdminClient();

  // Verify event ownership.
  const { data: ev } = await admin
    .from("events")
    .select("id, account_id")
    .eq("id", eventId)
    .maybeSingle<{ id: string; account_id: string }>();
  if (!ev || ev.account_id !== account.id)
    return { ok: false, error: "Not authorized." };

  // Verify night belongs to event.
  const { data: night } = await admin
    .from("event_nights")
    .select("id, event_id")
    .eq("id", nightId)
    .maybeSingle<{ id: string; event_id: string }>();
  if (!night || night.event_id !== eventId)
    return { ok: false, error: "Night not on this event." };

  if (allocationId) {
    const { data: alloc } = await admin
      .from("allocations")
      .select("id, event_night_id")
      .eq("id", allocationId)
      .maybeSingle<{ id: string; event_night_id: string }>();
    if (!alloc || alloc.event_night_id !== nightId)
      return { ok: false, error: "Allocation not on this night." };
  }

  // Existing phones on this night for dedupe.
  const { data: existing } = await admin
    .from("guests")
    .select("phone")
    .eq("event_night_id", nightId)
    .not("phone", "is", null);
  const existingPhones = new Set(
    ((existing ?? []) as Array<{ phone: string }>).map((r) => r.phone)
  );

  const result: ImportResult = {
    inserted: 0,
    skipped_dupe_phone: 0,
    skipped_invalid_phone: 0,
    skipped_missing_name: 0,
  };

  const toInsert: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    if (!r.full_name?.trim()) {
      result.skipped_missing_name++;
      continue;
    }
    let phone: string | null = null;
    if (r.phone) {
      const norm = toE164(r.phone);
      if (!norm) {
        result.skipped_invalid_phone++;
        continue;
      }
      if (existingPhones.has(norm)) {
        result.skipped_dupe_phone++;
        continue;
      }
      phone = norm;
      existingPhones.add(norm);
    }

    toInsert.push({
      event_night_id: nightId,
      allocation_id: allocationId,
      full_name: r.full_name.trim(),
      phone,
      email: r.email?.trim() || null,
      plus_ones: Math.max(0, Math.min(20, r.plus_ones | 0)),
      tier: r.tier,
      status,
      added_by_user_id: profile.id,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await admin.from("guests").insert(toInsert);
    if (error) return { ok: false, error: error.message };
    result.inserted = toInsert.length;
  }

  await admin.from("audit_log").insert({
    actor_user_id: profile.id,
    action: "guests.csv_import",
    entity_type: "event",
    entity_id: eventId,
    event_id: eventId,
    context: result as unknown as Record<string, unknown>,
  });

  revalidatePath(`/owner/events/${eventId}`);
  revalidatePath(`/owner/events/${eventId}/queue`);
  return { ok: true, result };
}
