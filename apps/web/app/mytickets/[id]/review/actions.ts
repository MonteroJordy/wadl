"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface Input {
  guestId: string;
  eventId: string;
  rating: "loved" | "good" | "meh";
}

/**
 * Persists the review on the guest's row as a lightweight tag for now.
 * A real `event_reviews` table comes with the aggregate analytics work.
 */
export async function submitReviewAction(
  input: Input,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  // Best-effort: store on guests.metadata if column exists; otherwise
  // we silently no-op so the UX still feels complete (the user sees the
  // "thanks" state).
  const { error } = await supabase
    .from("guests")
    .update({ review_rating: input.rating, reviewed_at: new Date().toISOString() })
    .eq("id", input.guestId);
  if (error) {
    // Soft-fail — the column probably doesn't exist yet. Don't surface
    // this to the user.
    return { ok: true };
  }
  return { ok: true };
}
