import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Wordmark } from "@/components/wadl";

export const dynamic = "force-dynamic";

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  tags: Array<{
    id: string;
    display_name: string | null;
    guest: { full_name: string } | null;
  }>;
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
      "id, storage_path, caption, tags:event_photo_tags(id, display_name, guest:guests(full_name))",
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false });
  const photos = (photosRaw ?? []) as unknown as PhotoRow[];

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingBottom: 24,
            borderBottom: "1px solid var(--w-line)",
            marginBottom: 24,
          }}
        >
          <div>
            <div className="w-type-meta">GALLERY</div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 6, lineHeight: 1.0 }}
            >
              {event.name}
            </div>
          </div>
          <Link href="/discover" style={{ textDecoration: "none" }}>
            <Wordmark variant="monogrid" size={18} />
          </Link>
        </header>

        {photos.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h2">Photos coming soon</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
              }}
            >
              The photographer hasn&apos;t uploaded yet. Check back later.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 4,
            }}
          >
            {photos.map((p) => {
              const {
                data: { publicUrl },
              } = admin.storage.from("event-photos").getPublicUrl(p.storage_path);
              const names = p.tags
                .map((t) => t.display_name ?? t.guest?.full_name)
                .filter(Boolean);
              return (
                <figure
                  key={p.id}
                  style={{
                    background: "var(--w-surface-2)",
                    position: "relative",
                    margin: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl}
                    alt={p.caption ?? names.join(", ")}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    loading="lazy"
                  />
                  {(p.caption || names.length > 0) && (
                    <figcaption
                      style={{
                        position: "absolute",
                        inset: "auto 0 0 0",
                        background:
                          "linear-gradient(to top, rgba(15,15,16,0.85), transparent)",
                        color: "var(--w-fg)",
                        padding: "16px 12px 10px",
                        fontSize: 12,
                      }}
                    >
                      {p.caption}
                      {names.length > 0 && (
                        <div
                          className="w-type-meta"
                          style={{ marginTop: 2 }}
                        >
                          {names.join(" · ")}
                        </div>
                      )}
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        )}

        <div
          className="w-type-meta"
          style={{
            marginTop: 40,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          <Link
            href="/discover"
            style={{ color: "var(--w-acc)", textDecoration: "none" }}
          >
            MORE EVENTS →
          </Link>
        </div>
      </div>
    </main>
  );
}
