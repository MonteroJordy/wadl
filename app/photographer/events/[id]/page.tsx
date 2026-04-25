import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import UploadForm from "./upload-form";

export const dynamic = "force-dynamic";

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export default async function PhotographerPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select(
      "id, name, account_id, account:accounts!inner(owner_user_id)"
    )
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      account_id: string;
      account: { owner_user_id: string };
    }>();
  if (!ev) notFound();

  let allowed = ev.account.owner_user_id === user.id;
  if (!allowed) {
    const { data: staff } = await admin
      .from("event_staff")
      .select("role")
      .eq("event_id", ev.id)
      .eq("user_id", user.id)
      .in("role", ["photographer", "manager", "door_manager"])
      .maybeSingle();
    allowed = !!staff;
  }
  if (!allowed) {
    return (
      <main className="mobile-frame">
        <h1 className="display-lg mt-8 mb-4">Not authorized</h1>
        <p className="text-muted">
          Ask the owner to add you as a photographer for this event.
        </p>
      </main>
    );
  }

  const { data: photosRaw } = await admin
    .from("event_photos")
    .select("id, storage_path, caption, created_at")
    .eq("event_id", ev.id)
    .order("created_at", { ascending: false });
  const photos = (photosRaw ?? []) as PhotoRow[];

  return (
    <main className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
      <Link href="/" className="label-mono hover:text-cream">
        WADL
      </Link>
      <h1 className="display-lg mt-3 mb-1">{ev.name}</h1>
      <p className="label-mono mb-4">Photographer · {photos.length} photos</p>

      <Link
        href={`/e/${ev.id}/gallery`}
        className="label-mono hover:text-cream block mb-4"
      >
        Public gallery →
      </Link>

      <UploadForm eventId={ev.id} />

      {photos.length > 0 && (
        <section className="mt-6">
          <p className="label-mono mb-3">Recent</p>
          <div className="grid grid-cols-3 gap-1">
            {photos.map((p) => {
              const {
                data: { publicUrl },
              } = admin.storage.from("event-photos").getPublicUrl(p.storage_path);
              return (
                <div key={p.id} className="aspect-square bg-s2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl}
                    alt={p.caption ?? ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
