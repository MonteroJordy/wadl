import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import AddPartnerForm from "./add-form";
import DeletePartnerButton from "./delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Venue partners — WADL" };

interface PartnerRow {
  id: string;
  name: string;
  city: string | null;
  handle: string | null;
  notes: string | null;
  created_at: string;
}

export default async function PartnersPage() {
  const { account } = await requireOwnerContext();

  if (account.account_type === "venue") {
    redirect("/owner/profile");
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("venue_partners")
    .select("id, name, city, handle, notes, created_at")
    .eq("account_id", account.id)
    .order("name");
  const partners = (data ?? []) as PartnerRow[];

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link
          href="/owner"
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← THIS WEEK
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">VENUE PARTNERS</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Venue partners
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            {partners.length === 0
              ? "Bookmark the rooms you collab with."
              : `${partners.length} partner${partners.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <AddPartnerForm />
        </div>

        {partners.length === 0 ? (
          <section
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "var(--w-acc-soft)",
                border: "1px solid var(--w-acc)",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--w-display)",
                fontSize: 28,
                fontWeight: 700,
                color: "var(--w-acc-ink)",
              }}
            >
              +
            </div>
            <div className="w-type-h1">No partners yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 460,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Brands and solo promoters don&apos;t own a room. Bookmark the
              venues you work with so the next event creation auto-completes
              and your nights stack across rooms.
            </p>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {partners.map((p) => (
              <article key={p.id} className="w-card" style={{ padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        color: "var(--w-fg)",
                        fontWeight: 600,
                        fontSize: 17,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                    </p>
                    <div
                      className="w-type-meta"
                      style={{ marginTop: 4 }}
                    >
                      {(p.city ?? "—").toUpperCase()}
                      {p.handle && (
                        <>
                          {" · "}
                          <span style={{ color: "var(--w-acc)" }}>
                            @{p.handle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <DeletePartnerButton partnerId={p.id} partnerName={p.name} />
                </div>
                {p.notes && (
                  <p
                    style={{
                      color: "var(--w-fg)",
                      opacity: 0.75,
                      fontSize: 14,
                      lineHeight: 1.5,
                      marginTop: 8,
                    }}
                  >
                    {p.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
