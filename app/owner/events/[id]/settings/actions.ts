"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateEventAction(eventId: string, formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();
  const flyerUrl = (formData.get("flyer_url") as string | null)?.trim();

  if (!name) return { error: "Event name required." };

  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({
      name,
      description: description || null,
      flyer_url: flyerUrl || null,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}`);
  revalidatePath(`/owner/events/${eventId}/settings`);
  revalidatePath("/owner");
  return { ok: true as const };
}

interface NightPatch {
  id: string;
  doors_at: string;
  cutoff_at: string | null;
  capacity_cap: number | null;
  lockdown_threshold_pct: number;
}

export async function updateNightsAction(eventId: string, patches: NightPatch[]) {
  const supabase = createClient();
  for (const p of patches) {
    const { error } = await supabase
      .from("event_nights")
      .update({
        doors_at: p.doors_at,
        cutoff_at: p.cutoff_at,
        capacity_cap: p.capacity_cap,
        lockdown_threshold_pct: p.lockdown_threshold_pct,
      })
      .eq("id", p.id);
    if (error) return { error: error.message };
  }
  revalidatePath(`/owner/events/${eventId}`);
  revalidatePath(`/owner/events/${eventId}/settings`);
  return { ok: true as const };
}

export async function backToDayDash(eventId: string) {
  redirect(`/owner/events/${eventId}`);
}
