import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";

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
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-6) var(--s-16)",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingBottom: "var(--s-6)",
            borderBottom: "1px solid var(--line)",
            marginBottom: "var(--s-6)",
          }}
        >
          <div>
            <div className="t-meta">Gallery</div>
            <div
              className="t-display-md"
              style={{ marginTop: "var(--s-2)", lineHeight: 1.0 }}
            >
              {event.name}
            </div>
          </div>
          <Link href="/discover" style={{ textDecoration: "none" }}>
            <Logo size={18} />
          </Link>
        </header>

        {photos.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-16) var(--s-8)",
              textAlign: "center",
            }}
          >
            <div className="t-h2">Photos coming soon</div>
            <p
              className="t-body-2"
              style={{ marginTop: "var(--s-3)" }}
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
                    background: "var(--bg-3)",
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
                          "linear-gradient(to top, rgba(10,10,10,0.85), transparent)",
                        color: "var(--fg)",
                        padding: "var(--s-4) var(--s-3) var(--s-2)",
                        fontSize: "var(--ts-sm)",
                      }}
                    >
                      {p.caption}
                      {names.length > 0 && (
                        <div
                          className="t-meta"
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
          className="t-meta"
          style={{
            marginTop: "var(--s-10)",
            textAlign: "center",
            color: "var(--fg-4)",
          }}
        >
          <Link
            href="/discover"
            style={{ color: "var(--fg)", textDecoration: "none" }}
          >
            More events →
          </Link>
        </div>
      </div>
    </main>
  );
}
