"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveGuestAction(eventId: string, guestId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { error } = await supabase
    .from("guests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", guestId);
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/queue`);
  revalidatePath(`/owner/events/${eventId}`);
  return { ok: true as const };
}

export async function rejectGuestAction(eventId: string, guestId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("guests")
    .update({ status: "rejected" })
    .eq("id", guestId);
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/queue`);
  revalidatePath(`/owner/events/${eventId}`);
  return { ok: true as const };
}

export async function approveAllAction(eventId: string, nightId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." };

  const { error } = await supabase
    .from("guests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("event_night_id", nightId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/queue`);
  revalidatePath(`/owner/events/${eventId}`);
  return { ok: true as const };
}

export async function rejectAllAction(eventId: string, nightId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("guests")
    .update({ status: "rejected" })
    .eq("event_night_id", nightId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}/queue`);
  revalidatePath(`/owner/events/${eventId}`);
  return { ok: true as const };
}
