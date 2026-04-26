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

  // Venue accounts have their own venues; the partner directory is for
  // brand + individual. Bounce venue accounts to /owner/profile where
  // they manage actual venue rows.
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
      className="mx-auto w-full max-w-4xl px-4 md:px-8 pt-6 pb-16"
    >
      <header className="flex items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <Link
            href="/owner"
            className="label-mono hover:text-cream transition mb-2 inline-block"
          >
            ← This week
          </Link>
          <h1 className="font-display text-4xl md:text-5xl text-cream uppercase tracking-wide leading-[0.9]">
            Venue partners
          </h1>
          <p className="label-mono mt-2">
            {partners.length === 0
              ? "Bookmark the rooms you collab with"
              : `${partners.length} partner${partners.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </header>

      <div className="mb-6">
        <AddPartnerForm />
      </div>

      {partners.length === 0 ? (
        <section className="rounded-2xl border border-line bg-s1 px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-coral/10 border border-coral/30 mx-auto mb-5 flex items-center justify-center">
            <span className="font-display text-3xl text-coral">＋</span>
          </div>
          <p className="font-display text-3xl text-cream uppercase tracking-wide mb-2">
            No partners yet
          </p>
          <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
            Brands and solo promoters don&apos;t own a room. Bookmark the
            venues you work with so the next event creation auto-completes
            and your nights stack across rooms.
          </p>
        </section>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {partners.map((p) => (
            <article
              key={p.id}
              className="card hover:border-coral/40 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-sans text-cream font-semibold text-lg truncate">
                    {p.name}
                  </p>
                  <p className="label-mono mt-1">
                    {p.city ?? "—"}
                    {p.handle && (
                      <>
                        {" · "}
                        <span className="text-coral">@{p.handle}</span>
                      </>
                    )}
                  </p>
                </div>
                <DeletePartnerButton partnerId={p.id} partnerName={p.name} />
              </div>
              {p.notes && (
                <p className="text-cream/70 text-sm leading-relaxed mt-2">
                  {p.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
