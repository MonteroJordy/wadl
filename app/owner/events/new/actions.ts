"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";

interface NightInput {
  night_date: string;
  doors_at: string;
  cutoff_at: string | null;
  capacity_cap: number | null;
}

const VALID_EVENT_TYPES: EventType[] = [
  "venue_owned",
  "brand_takeover",
  "co_produced",
  "brand_pop_up",
];

export async function createEventAction(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const eventType = formData.get("event_type") as string | null;
  const venueIdRaw = formData.get("venue_id") as string | null;
  const description = (formData.get("description") as string | null)?.trim();
  const flyerUrl = (formData.get("flyer_url") as string | null)?.trim();
  const nightsJson = formData.get("nights") as string | null;

  if (!name) return { error: "Event name is required." };
  if (!eventType || !VALID_EVENT_TYPES.includes(eventType as EventType)) {
    return { error: "Pick an event type." };
  }
  if (!nightsJson) return { error: "Add at least one night." };

  let nights: NightInput[];
  try {
    nights = JSON.parse(nightsJson);
  } catch {
    return { error: "Could not parse nights." };
  }
  if (!Array.isArray(nights) || nights.length === 0) {
    return { error: "Add at least one night." };
  }
  for (const n of nights) {
    if (!n.night_date || !n.doors_at) {
      return { error: "Every night needs a date and doors time." };
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle<{ account_id: string | null }>();
  if (!profile?.account_id) return { error: "No account." };

  const venueId =
    venueIdRaw && venueIdRaw !== "none" && venueIdRaw.length > 0
      ? venueIdRaw
      : null;

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .insert({
      account_id: profile.account_id,
      venue_id: venueId,
      event_type: eventType,
      name,
      description: description || null,
      flyer_url: flyerUrl || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (eventErr || !event) {
    return { error: eventErr?.message ?? "Could not create event." };
  }

  const rows = nights.map((n) => ({
    event_id: event.id,
    night_date: n.night_date,
    doors_at: n.doors_at,
    cutoff_at: n.cutoff_at || null,
    capacity_cap: n.capacity_cap && n.capacity_cap > 0 ? n.capacity_cap : null,
  }));

  const { error: nightsErr } = await supabase.from("event_nights").insert(rows);
  if (nightsErr) {
    // Clean up event so we don't leave an orphan.
    await supabase.from("events").delete().eq("id", event.id);
    return { error: nightsErr.message };
  }

  revalidatePath("/owner");
  redirect(`/owner/events/${event.id}`);
}
