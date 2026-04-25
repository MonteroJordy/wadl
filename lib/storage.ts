import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Upload an event flyer to the public `event-flyers` bucket.
 * Path convention: <event_id>/flyer.<ext>. Upserts so re-uploads replace.
 */
export async function uploadEventFlyer(
  eventId: string,
  file: File
): Promise<UploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large (max 5 MB)." };
  }
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "Use JPG, PNG, or WebP." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

  const admin = createAdminClient();
  const path = `${eventId}/flyer.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("event-flyers")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = admin.storage.from("event-flyers").getPublicUrl(path);

  // Cache-bust so an updated flyer shows immediately even when a CDN
  // serves the same path.
  return { ok: true, url: `${publicUrl}?v=${Date.now()}` };
}

/**
 * Upload an event photo (photographer flow) to the public `event-photos` bucket.
 * Path: <event_id>/<random>.<ext>. Returns both the storage path and a public URL.
 */
export async function uploadEventPhoto(
  eventId: string,
  file: File
): Promise<
  { ok: true; path: string; url: string } | { ok: false; error: string }
> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File too large (max 5 MB)." };
  if (!ALLOWED.includes(file.type)) return { ok: false, error: "Use JPG, PNG, or WebP." };

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const path = `${eventId}/${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("event-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = admin.storage.from("event-photos").getPublicUrl(path);
  return { ok: true, path, url: publicUrl };
}
