"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGuestMutateAccess } from "@/lib/guest-access";

export interface MergeChoices {
  /** Which side wins for each field. */
  full_name: "a" | "b";
  phone: "a" | "b";
  email: "a" | "b";
  notes: "a" | "b" | "concat";
}

export async function mergeGuestsAction(
  aId: string,
  bId: string,
  choices: MergeChoices
): Promise<
  | { ok: true; winnerId: string; loserId: string }
  | { ok: false; error: string }
> {
  if (aId === bId) return { ok: false, error: "Same guest passed twice." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired." };

  const accessA = await resolveGuestMutateAccess(user.id, aId);
  const accessB = await resolveGuestMutateAccess(user.id, bId);
  if (!accessA || !accessB) return { ok: false, error: "Not authorized for both guests." };

  const admin = createAdminClient();
  const { data: rowsRaw } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, email, notes, tags, plus_ones, tier, status, allocation_id, event_night_id, created_at, flag_dna, flag_reason, check_in_token"
    )
    .in("id", [aId, bId]);
  const rows = (rowsRaw ?? []) as Array<{
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    tags: string[] | null;
    plus_ones: number;
    tier: string;
    status: string;
    allocation_id: string | null;
    event_night_id: string;
    created_at: string;
    flag_dna: boolean;
    flag_reason: string | null;
    check_in_token: string | null;
  }>;
  const a = rows.find((r) => r.id === aId);
  const b = rows.find((r) => r.id === bId);
  if (!a || !b) return { ok: false, error: "Guest not found." };

  // Winner = older record (lowest created_at), loser is the other.
  const winner = a.created_at <= b.created_at ? a : b;
  const loser = winner.id === a.id ? b : a;

  const pickName = choices.full_name === "a" ? a.full_name : b.full_name;
  const pickPhone = choices.phone === "a" ? a.phone : b.phone;
  const pickEmail = choices.email === "a" ? a.email : b.email;
  const pickNotes =
    choices.notes === "a"
      ? a.notes
      : choices.notes === "b"
      ? b.notes
      : [a.notes, b.notes].filter(Boolean).join("\n\n---\n\n") || null;

  const mergedTags = Array.from(
    new Set([...(a.tags ?? []), ...(b.tags ?? [])])
  );

  const mergedFlag = a.flag_dna || b.flag_dna;
  const mergedFlagReason = mergedFlag
    ? [a.flag_reason, b.flag_reason].filter(Boolean).join(" / ") || null
    : null;

  // Update winner.
  const { error: upErr } = await admin
    .from("guests")
    .update({
      full_name: pickName,
      phone: pickPhone,
      email: pickEmail,
      notes: pickNotes,
      tags: mergedTags,
      flag_dna: mergedFlag,
      flag_reason: mergedFlagReason,
    })
    .eq("id", winner.id);
  if (upErr) return { ok: false, error: upErr.message };

  // Re-parent loser's check_ins to the winner.
  await admin
    .from("check_ins")
    .update({ guest_id: winner.id })
    .eq("guest_id", loser.id);

  // Re-parent referrals (people referred by loser → now referred by winner).
  await admin
    .from("guests")
    .update({ referred_by_guest_id: winner.id })
    .eq("referred_by_guest_id", loser.id);

  // Soft-delete loser by marking merged_into.
  await admin
    .from("guests")
    .update({
      merged_into_guest_id: winner.id,
      merged_at: new Date().toISOString(),
      status: "cancelled",
    })
    .eq("id", loser.id);

  // Audit.
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    action: "guest.merge",
    entity_type: "guest",
    entity_id: winner.id,
    event_id: accessA.eventId,
    context: {
      winner: winner.id,
      loser: loser.id,
      choices,
    },
  });

  revalidatePath(`/owner/events/${accessA.eventId}`);
  revalidatePath(`/owner/events/${accessA.eventId}/guests/${winner.id}`);
  return { ok: true, winnerId: winner.id, loserId: loser.id };
}
