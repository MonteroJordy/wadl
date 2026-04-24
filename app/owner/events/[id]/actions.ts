"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFreezeAction(eventId: string, nightId: string, frozen: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("event_nights")
    .update({ is_frozen: frozen })
    .eq("id", nightId);
  if (error) return { error: error.message };
  revalidatePath(`/owner/events/${eventId}`);
  revalidatePath("/owner");
  return { ok: true as const };
}
