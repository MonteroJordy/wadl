import { createAdminClient } from "@/lib/supabase/admin";

interface RawGuest {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  flag_reason: string | null;
  sms_opted_out: boolean;
  check_in_token: string | null;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
  tags: string[];
  allocation: { holder_name: string } | null;
  night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string };
  };
  check_ins: Array<{
    state: string;
    scanned_at: string;
    scanner: { full_name: string | null } | null;
  }>;
}

/**
 * Fetches a guest row with all the joins the guest-detail page needs.
 * Returns null if not found or not on the given event (scoping check).
 */
export async function fetchGuestForDetail(guestId: string, eventId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, email, plus_ones, tier, status, flag_dna, flag_reason, sms_opted_out, check_in_token, created_at, approved_at, notes, tags, " +
        "allocation:allocations(holder_name), " +
        "night:event_nights!inner(night_date, doors_at, event:events!inner(id, name)), " +
        "check_ins(state, scanned_at, scanner:profiles(full_name))"
    )
    .eq("id", guestId)
    .maybeSingle<RawGuest>();

  if (!data) return null;
  if (data.night.event.id !== eventId) return null;

  // Sort check_ins newest-first for display.
  data.check_ins.sort((a, b) => (a.scanned_at > b.scanned_at ? -1 : 1));

  // Tally referrals brought by this guest (Day 11).
  const { count } = await admin
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("referred_by_guest_id", guestId);

  return { ...data, referred_count: count ?? 0 };
}
