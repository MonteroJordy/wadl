import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";
import { QRBlock } from "@/components/v5/qr-block";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your pass — WADL" };

interface PageProps {
  params: { token: string };
  searchParams: { g?: string };
}

const TIER_LABEL: Record<string, string> = {
  ga: "GA",
  vip: "VIP",
  aaa: "AAA",
};

export default async function GuestlessPass({
  params,
  searchParams,
}: PageProps) {
  const guestToken = searchParams.g;
  if (!guestToken) notFound();

  const supabase = createAdminClient();

  const { data: guest } = await supabase
    .from("guests")
    .select(
      "id, full_name, tier, status, qr_token, allocation_id, event_night_id, guestless",
    )
    .eq("qr_token", guestToken)
    .maybeSingle();
  if (!guest || !guest.guestless) notFound();

  const { data: alloc } = await supabase
    .from("allocations")
    .select("magic_link_token")
    .eq("id", guest.allocation_id)
    .maybeSingle();
  if (alloc?.magic_link_token !== params.token) notFound();

  const { data: night } = await supabase
    .from("event_nights")
    .select(
      "night_date, doors_at, event:events ( name, venue:venues ( name, address, city ) )",
    )
    .eq("id", guest.event_night_id)
    .maybeSingle();
  const ev = Array.isArray(night?.event) ? night?.event[0] : night?.event;
  const venue = Array.isArray(ev?.venue) ? ev?.venue[0] : ev?.venue;

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "var(--s-4) var(--s-5)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={20} />
        <span className="chip chip--ok">Approved</span>
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-5)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        {/* Tonight hero */}
        <section>
          <div className="t-meta">TONIGHT</div>
          <h1
            className="t-display-md"
            style={{ marginTop: "var(--s-2)", lineHeight: 1.1 }}
          >
            {ev?.name ?? "Your event"}
          </h1>
          <div
            className="t-body-2"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
          >
            {night ? `${fmtDate(night.night_date)} · ${fmtTime(night.doors_at)}` : ""}
            {venue?.name ? ` · ${venue.name}` : ""}
          </div>
        </section>

        {/* QR panel */}
        <div
          style={{
            background: "var(--fg)",
            padding: "var(--s-6)",
            borderRadius: "var(--r-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--s-4)",
          }}
        >
          <QRBlock size={240} seed={guest.qr_token ?? guest.id} />
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "var(--bg)",
              textTransform: "uppercase",
            }}
          >
            {guest.full_name} · {TIER_LABEL[guest.tier] ?? guest.tier?.toUpperCase()}
          </div>
        </div>

        {venue?.address && (
          <div className="card" style={{ padding: "var(--s-4)" }}>
            <div className="t-meta">ADDRESS</div>
            <div className="t-body" style={{ marginTop: "var(--s-2)" }}>
              {venue.address}
              {venue.city ? `, ${venue.city}` : ""}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: "var(--s-4)" }}>
          <div className="t-meta">SAVE THIS PAGE</div>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
          >
            Add to your home screen or screenshot the QR. The door scanner
            works offline if reception drops.
          </p>
        </div>

        <Link
          href={`/g/${params.token}/upgrade?g=${guest.qr_token}`}
          className="btn btn--ghost btn--block"
          style={{ textDecoration: "none" }}
        >
          Save my passes to an account →
        </Link>
      </div>
    </main>
  );
}
