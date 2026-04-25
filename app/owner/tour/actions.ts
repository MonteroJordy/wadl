"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerContext } from "@/lib/owner";
import { seedDemoDataAction } from "@/lib/demo-seed";

export async function completeTourAction(): Promise<void> {
  const { supabase, profile } = await requireOwnerContext();
  await supabase
    .from("profiles")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", profile.id);
  revalidatePath("/owner");
}

export async function dismissTourAction(): Promise<void> {
  const { supabase, profile } = await requireOwnerContext();
  await supabase
    .from("profiles")
    .update({ tour_dismissed_at: new Date().toISOString() })
    .eq("id", profile.id);
  revalidatePath("/owner");
}

export async function seedDemoFromTourAction() {
  return seedDemoDataAction();
}
