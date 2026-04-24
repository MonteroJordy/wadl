import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns { eventId, isOwner, isManager } if the given user can mutate the
 * given guest. Null if not. Used by flag + other owner-or-manager actions.
 *
 * Allowed callers:
 *   - Account owner of the event (requireOwnerContext equivalent)
 *   - Door manager scoped to the event via event_staff
 */
export async function resolveGuestMutateAccess(
  userId: string,
  guestId: string
): Promise<{ eventId: string; isOwner: boolean; isManager: boolean } | null> {
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("guests")
    .select("id, event_night_id")
    .eq("id", guestId)
    .maybeSingle<{ id: string; event_night_id: string }>();
  if (!guest) return null;

  const { data: night } = await admin
    .from("event_nights")
    .select("event_id")
    .eq("id", guest.event_night_id)
    .maybeSingle<{ event_id: string }>();
  if (!night) return null;

  const { data: event } = await admin
    .from("events")
    .select("id, account_id")
    .eq("id", night.event_id)
    .maybeSingle<{ id: string; account_id: string }>();
  if (!event) return null;

  const { data: account } = await admin
    .from("accounts")
    .select("owner_user_id")
    .eq("id", event.account_id)
    .maybeSingle<{ owner_user_id: string }>();

  const isOwner = account?.owner_user_id === userId;
  let isManager = false;
  if (!isOwner) {
    const { data: staff } = await admin
      .from("event_staff")
      .select("role")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .eq("role", "door_manager")
      .maybeSingle();
    isManager = Boolean(staff);
  }

  if (!isOwner && !isManager) return null;
  return { eventId: event.id, isOwner, isManager };
}
