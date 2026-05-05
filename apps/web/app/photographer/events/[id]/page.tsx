import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip, IconArrow, WFrame, Wordmark } from "@/components/wadl";
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
    .select("id, name, account_id, account:accounts!inner(owner_user_id)")
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
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <div style={{ padding: "20px 24px 0" }}>
            <Wordmark variant="monogrid" size={18} />
          </div>
          <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
            <Chip tone="warn">NOT AUTHORIZED</Chip>
            <div className="w-type-display-md" style={{ marginTop: 12 }}>
              Ask the owner to add you.
            </div>
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)", marginTop: 12 }}
            >
              You need a photographer role on this event to upload.
            </p>
          </div>
        </WFrame>
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
    <main id="main-content">
      <WFrame style={{ paddingBottom: 64 }}>
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <Wordmark variant="monogrid" size={18} />
          </Link>
          <Chip tone="acc">PHOTOGRAPHER</Chip>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">
            {photos.length} PHOTO{photos.length === 1 ? "" : "S"} UPLOADED
          </div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            {ev.name}
          </div>
          <Link
            href={`/e/${ev.id}/gallery`}
            className="w-type-meta"
            style={{
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
            }}
          >
            PUBLIC GALLERY <IconArrow size={12} />
          </Link>
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <UploadForm eventId={ev.id} />
        </div>

        {photos.length > 0 && (
          <div style={{ padding: "32px 24px 0" }}>
            <div className="w-type-meta" style={{ marginBottom: 12 }}>
              RECENT
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 4,
              }}
            >
              {photos.map((p) => {
                const {
                  data: { publicUrl },
                } = admin.storage
                  .from("event-photos")
                  .getPublicUrl(p.storage_path);
                return (
                  <div
                    key={p.id}
                    style={{
                      aspectRatio: "1 / 1",
                      background: "var(--w-surface-2)",
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrl}
                      alt={p.caption ?? ""}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </WFrame>
    </main>
  );
}
