"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadEventPhoto } from "@/lib/storage";

async function authorizePhotographer(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();

  const { data: ev } = await admin
    .from("events")
    .select("id, account_id, account:accounts!inner(owner_user_id)")
    .eq("id", eventId)
    .maybeSingle<{
      id: string;
      account_id: string;
      account: { owner_user_id: string };
    }>();
  if (!ev) return null;
  if (ev.account.owner_user_id === user.id) return { user, eventId };
  const { data: staff } = await admin
    .from("event_staff")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .in("role", ["photographer", "manager", "door_manager"])
    .maybeSingle();
  if (!staff) return null;
  return { user, eventId };
}

export async function uploadPhotoAction(
  eventId: string,
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const auth = await authorizePhotographer(eventId);
  if (!auth) return { ok: false, error: "Not authorized." };

  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string | null)?.trim() || null;
  if (!file) return { ok: false, error: "No file." };

  const upload = await uploadEventPhoto(eventId, file);
  if (!upload.ok) return { ok: false, error: upload.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_photos")
    .insert({
      event_id: eventId,
      uploaded_by: auth.user.id,
      storage_path: upload.path,
      caption,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };

  revalidatePath(`/photographer/events/${eventId}`);
  revalidatePath(`/e/${eventId}/gallery`);
  return { ok: true, id: data.id };
}

export async function tagPhotoAction(
  eventId: string,
  photoId: string,
  guestId: string | null,
  displayName: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await authorizePhotographer(eventId);
  if (!auth) return { ok: false, error: "Not authorized." };

  const admin = createAdminClient();
  // Photo must belong to event.
  const { data: ph } = await admin
    .from("event_photos")
    .select("id, event_id")
    .eq("id", photoId)
    .maybeSingle<{ id: string; event_id: string }>();
  if (!ph || ph.event_id !== eventId) return { ok: false, error: "Photo not found." };

  const { error } = await admin.from("event_photo_tags").insert({
    photo_id: photoId,
    guest_id: guestId,
    display_name: displayName?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/e/${eventId}/gallery`);
  return { ok: true };
}
