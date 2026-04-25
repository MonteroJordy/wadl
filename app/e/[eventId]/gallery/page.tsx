import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  tags: Array<{ id: string; display_name: string | null; guest: { full_name: string } | null }>;
}

export default async function PublicGalleryPage({
  params,
}: {
  params: { eventId: string };
}) {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, name, flyer_url")
    .eq("id", params.eventId)
    .maybeSingle<{ id: string; name: string; flyer_url: string | null }>();
  if (!event) notFound();

  const { data: photosRaw } = await admin
    .from("event_photos")
    .select(
      "id, storage_path, caption, tags:event_photo_tags(id, display_name, guest:guests(full_name))"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  const photos = (photosRaw ?? []) as unknown as PhotoRow[];

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 pt-8 pb-12">
      <header className="text-center mb-6">
        <p className="label-mono mb-1">Gallery</p>
        <h1 className="display-lg">{event.name}</h1>
      </header>

      {photos.length === 0 ? (
        <p className="label-mono text-center mt-12">
          Photos coming soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
          {photos.map((p) => {
            const {
              data: { publicUrl },
            } = admin.storage.from("event-photos").getPublicUrl(p.storage_path);
            const names = p.tags
              .map((t) => t.display_name ?? t.guest?.full_name)
              .filter(Boolean);
            return (
              <figure key={p.id} className="bg-s2 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicUrl}
                  alt={p.caption ?? names.join(", ")}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {(p.caption || names.length > 0) && (
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-bg/70 text-cream text-xs p-2">
                    {p.caption}
                    {names.length > 0 && (
                      <span className="block label-mono mt-0.5">
                        {names.join(" · ")}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}

      <p className="label-mono mt-8 text-center">
        <Link href="/discover" className="hover:text-cream">
          More events →
        </Link>
      </p>
    </main>
  );
}
