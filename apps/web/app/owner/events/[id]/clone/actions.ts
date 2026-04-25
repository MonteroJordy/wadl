"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CloneInput {
  newName: string;
  shiftDays: number;
  copyAllocations: boolean;
}

export async function cloneEventAction(
  sourceEventId: string,
  input: CloneInput
): Promise<{ ok: true; newEventId: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  // Verify ownership and pull the source event.
  const { data: source } = await supabase
    .from("events")
    .select(
      "id, name, account_id, venue_id, event_type, description, flyer_url, event_nights(id, night_date, doors_at, cutoff_at, capacity_cap, lockdown_threshold_pct)"
    )
    .eq("id", sourceEventId)
    .maybeSingle();

  if (!source) return { ok: false, error: "Event not found." };

  // RLS on events already gates ownership for SELECT — extra check for clarity.
  const admin = createAdminClient();
  const { data: ownerCheck } = await admin
    .from("accounts")
    .select("owner_user_id")
    .eq("id", source.account_id)
    .maybeSingle<{ owner_user_id: string }>();
  if (ownerCheck?.owner_user_id !== user.id) {
    return { ok: false, error: "Not authorized." };
  }

  // Insert the new event.
  const { data: newEvent, error: evErr } = await admin
    .from("events")
    .insert({
      account_id: source.account_id,
      venue_id: source.venue_id,
      event_type: source.event_type,
      name: input.newName.trim() || `${source.name} (copy)`,
      description: source.description,
      flyer_url: source.flyer_url,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (evErr || !newEvent) return { ok: false, error: evErr?.message ?? "Could not create event." };

  // Shift nights by N days.
  const sourceNights = (source.event_nights ?? []) as Array<{
    id: string;
    night_date: string;
    doors_at: string;
    cutoff_at: string | null;
    capacity_cap: number | null;
    lockdown_threshold_pct: number;
  }>;

  const dayMs = 86_400_000;
  const newNightRows = sourceNights.map((n) => ({
    event_id: newEvent.id,
    night_date: new Date(
      new Date(n.night_date).getTime() + input.shiftDays * dayMs
    )
      .toISOString()
      .slice(0, 10),
    doors_at: new Date(
      new Date(n.doors_at).getTime() + input.shiftDays * dayMs
    ).toISOString(),
    cutoff_at: n.cutoff_at
      ? new Date(new Date(n.cutoff_at).getTime() + input.shiftDays * dayMs).toISOString()
      : null,
    capacity_cap: n.capacity_cap,
    lockdown_threshold_pct: n.lockdown_threshold_pct,
  }));

  const { data: insertedNights, error: nightsErr } = await admin
    .from("event_nights")
    .insert(newNightRows)
    .select("id, night_date");
  if (nightsErr) {
    await admin.from("events").delete().eq("id", newEvent.id);
    return { ok: false, error: nightsErr.message };
  }

  // Map source night.id → new night.id by date order.
  const sortedSource = [...sourceNights].sort((a, b) =>
    a.doors_at < b.doors_at ? -1 : 1
  );
  const sortedNew = [...(insertedNights ?? [])].sort((a, b) =>
    a.night_date < b.night_date ? -1 : 1
  );
  const nightMap = new Map<string, string>();
  for (let i = 0; i < sortedSource.length; i++) {
    if (sortedNew[i]) nightMap.set(sortedSource[i].id, sortedNew[i].id);
  }

  if (input.copyAllocations) {
    const sourceNightIds = sortedSource.map((n) => n.id);
    const { data: allocs } = await admin
      .from("allocations")
      .select(
        "event_night_id, holder_name, holder_phone, holder_email, cap, auto_approve, list_open, plus_ones_allowed"
      )
      .in("event_night_id", sourceNightIds);

    const newAllocs = ((allocs ?? []) as Array<{
      event_night_id: string;
      holder_name: string;
      holder_phone: string | null;
      holder_email: string | null;
      cap: number;
      auto_approve: boolean;
      list_open: boolean;
      plus_ones_allowed: boolean;
    }>)
      .map((a) => {
        const newNightId = nightMap.get(a.event_night_id);
        if (!newNightId) return null;
        return {
          event_night_id: newNightId,
          holder_name: a.holder_name,
          holder_phone: a.holder_phone,
          holder_email: a.holder_email,
          cap: a.cap,
          auto_approve: a.auto_approve,
          list_open: a.list_open,
          plus_ones_allowed: a.plus_ones_allowed,
          created_by: user.id,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (newAllocs.length > 0) {
      await admin.from("allocations").insert(newAllocs);
    }
  }

  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "event.cloned",
    entity_type: "event",
    entity_id: newEvent.id,
    event_id: newEvent.id,
    context: { source_event_id: sourceEventId, shift_days: input.shiftDays },
  });

  revalidatePath("/owner");
  return { ok: true, newEventId: newEvent.id };
}
