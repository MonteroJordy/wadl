"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultEventType } from "@wadl/shared/account-type";

export async function completeWelcomeAction(): Promise<void> {
  const { profile } = await requireOwnerContext();
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", profile.id);
  revalidatePath("/owner");
}

export async function skipWelcomeAction(): Promise<void> {
  await completeWelcomeAction();
  redirect("/owner");
}

interface QuickEventInput {
  name: string;
  night_date: string; // YYYY-MM-DD
  doors_at: string; // local time HH:MM
  capacity_cap: number | null;
}

export async function createFirstEventAction(
  input: QuickEventInput
): Promise<
  | { ok: true; eventId: string; nightId: string }
  | { ok: false; error: string }
> {
  const { account, profile } = await requireOwnerContext();
  const admin = createAdminClient();

  if (!input.name?.trim()) return { ok: false, error: "Enter an event name." };
  if (!input.night_date) return { ok: false, error: "Pick a date." };

  // Pick the account's primary venue if any.
  const { data: venues } = await admin
    .from("venues")
    .select("id")
    .eq("account_id", account.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const venueId = (venues ?? [])[0]?.id ?? null;

  const { data: ev, error: eErr } = await admin
    .from("events")
    .insert({
      account_id: account.id,
      venue_id: venueId,
      event_type: defaultEventType(account.account_type),
      name: input.name.trim(),
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (eErr || !ev) return { ok: false, error: eErr?.message ?? "Could not create event." };

  // Build doors_at as ISO from date + time.
  const doors = new Date(`${input.night_date}T${input.doors_at || "23:00"}:00`);
  const cutoff = new Date(doors.getTime() - 2 * 60 * 60 * 1000);

  const { data: night, error: nErr } = await admin
    .from("event_nights")
    .insert({
      event_id: ev.id,
      night_date: input.night_date,
      doors_at: doors.toISOString(),
      cutoff_at: cutoff.toISOString(),
      capacity_cap: input.capacity_cap,
    })
    .select("id")
    .single();
  if (nErr || !night) {
    return { ok: false, error: nErr?.message ?? "Could not create night." };
  }

  return { ok: true, eventId: ev.id, nightId: night.id };
}
