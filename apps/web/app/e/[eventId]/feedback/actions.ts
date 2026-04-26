"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface SubmitInput {
  eventId: string;
  token: string;
  rating: number;
  tags: string[];
  comment: string | null;
}

const ALLOWED_TAGS = new Set([
  "music", "vibe", "door", "crowd", "drinks", "venue", "value",
]);

export async function submitFeedbackAction(
  input: SubmitInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Pick a rating between 1 and 5." };
  }

  // Filter tags to allow-list, dedupe, cap at 5.
  const cleanTags = Array.from(
    new Set(input.tags.filter((t) => ALLOWED_TAGS.has(t)))
  ).slice(0, 5);

  const cleanComment = input.comment ? input.comment.slice(0, 1000) : null;

  const admin = createAdminClient();

  // Resolve guest_id from token if provided. We never reject a missing-token
  // submission (anonymous feedback is allowed), but we do verify the event
  // exists.
  let guestId: string | null = null;
  if (input.token) {
    const { data: g } = await admin
      .from("guests")
      .select("id")
      .eq("check_in_token", input.token)
      .maybeSingle<{ id: string }>();
    guestId = g?.id ?? null;
  }

  const { data: ev } = await admin
    .from("events")
    .select("id")
    .eq("id", input.eventId)
    .maybeSingle<{ id: string }>();
  if (!ev) return { ok: false, error: "Event not found." };

  // The unique index event_feedback_one_per_guest blocks dupes when guestId
  // is set. For anonymous submissions there's no dedupe (by design).
  const { error } = await admin.from("event_feedback").insert({
    event_id: input.eventId,
    guest_id: guestId,
    rating: input.rating,
    tags: cleanTags,
    comment: cleanComment,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique violation — already submitted.
      return { ok: false, error: "You already rated this event. Thanks!" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
