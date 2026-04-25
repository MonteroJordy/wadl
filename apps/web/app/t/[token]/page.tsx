import Link from "next/link";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface TicketData {
  id: string;
  full_name: string;
  plus_ones: number;
  status: string;
  check_in_token: string;
  night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; flyer_url: string | null };
  };
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-mint/20 text-mint border-mint/40"
      : status === "pending"
      ? "bg-gold/20 text-gold border-gold/40"
      : status === "rejected"
      ? "bg-coral/20 text-coral border-coral/40"
      : "bg-s3 text-muted border-line";
  return (
    <span
      className={`inline-block border rounded-full px-3 py-1 label-mono ${cls}`}
    >
      {status}
    </span>
  );
}

export default async function TicketPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, flyer_url))"
    )
    .eq("check_in_token", params.token)
    .maybeSingle<TicketData>();

  if (!guest) {
    return (
      <main id="main-content" className="mobile-frame">
        <div className="pt-12 text-center">
          <p className="label-mono mb-3">WADL</p>
          <h1 className="display-lg mb-3">Ticket not found.</h1>
          <p className="text-muted text-sm">
            The link may be wrong or the ticket may have been revoked.
          </p>
          <Link href="/mytickets" className="btn-primary mt-6 inline-block w-auto px-6">
            My tickets
          </Link>
        </div>
      </main>
    );
  }

  const svg = await QRCode.toString(guest.check_in_token, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0a0a0a", light: "#F2EDE4" },
  });

  const active = guest.status === "approved";

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/mytickets" className="label-mono hover:text-cream">
          ← Tickets
        </Link>
        <StatusPill status={guest.status} />
      </header>

      <h1 className="display-lg mb-1">{guest.night.event.name}</h1>
      <p className="label-mono mb-6">
        {fmtDate(guest.night.night_date)} · Doors {fmtTime(guest.night.doors_at)}
      </p>

      <div
        className={`rounded-lg p-6 flex items-center justify-center ${
          active ? "bg-cream" : "bg-s2 border border-line"
        }`}
        style={{ aspectRatio: "1 / 1" }}
      >
        {active ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="text-center px-4">
            <p className="font-display text-4xl text-gold mb-3">PENDING</p>
            <p className="text-muted text-sm">
              Your QR activates once the host approves this RSVP.
            </p>
          </div>
        )}
      </div>

      <div className="card mt-5">
        <p className="label-mono mb-1">Guest</p>
        <p className="font-sans text-cream font-semibold">
          {guest.full_name}
          {guest.plus_ones > 0 && (
            <span className="text-muted font-normal"> +{guest.plus_ones}</span>
          )}
        </p>
      </div>

      {active && (
        <div className="grid grid-cols-2 gap-2 mt-5">
          <a
            href={`/api/wallet/apple/${guest.check_in_token}`}
            className="btn-ghost text-center text-xs"
          >
            Add to Apple Wallet
          </a>
          <a
            href={`/api/wallet/google/${guest.check_in_token}`}
            className="btn-ghost text-center text-xs"
          >
            Add to Google Wallet
          </a>
        </div>
      )}

      <p className="label-mono mt-6 text-center break-all">
        <span className="text-muted">Token:</span> {guest.check_in_token}
      </p>

      <p className="label-mono mt-3 text-center">
        <a
          href={`/api/events/${guest.night.event.id}/calendar.ics`}
          className="hover:text-cream"
        >
          + Add to calendar
        </a>
      </p>

      <p className="label-mono mt-3 text-center">
        <a
          href={`/referral/${guest.id}`}
          className="hover:text-cream"
        >
          Bring a friend →
        </a>
      </p>

      <p className="label-mono mt-auto pt-8 text-center">
        Show this screen at the door.
      </p>
    </main>
  );
}
