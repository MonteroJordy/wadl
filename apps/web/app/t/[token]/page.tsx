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
  // Past-event view: when doors_at is more than 6h in the past, switch to a
  // post-event "you attended" UI instead of showing the (now-useless) QR.
  const isPast =
    new Date(guest.night.doors_at).getTime() < Date.now() - 6 * 60 * 60_000;
  // Look for an approved scan to know if they actually came.
  const admin2 = createAdminClient();
  const { data: scan } = isPast
    ? await admin2
        .from("check_ins")
        .select("scanned_at")
        .eq("guest_id", guest.id)
        .eq("state", "approved")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ scanned_at: string }>()
    : { data: null };

  if (isPast) {
    return (
      <main id="main-content" className="mobile-frame">
        <header className="flex items-center justify-between pt-6 pb-4">
          <Link href="/mytickets" className="label-mono hover:text-cream">
            ← Tickets
          </Link>
          <p className="label-mono">Past event</p>
        </header>
        <h1 className="display-lg mb-1">{guest.night.event.name}</h1>
        <p className="label-mono mb-6">
          {fmtDate(guest.night.night_date)} · Doors {fmtTime(guest.night.doors_at)}
        </p>

        {guest.night.event.flyer_url && (
          <div
            className="w-full rounded-lg overflow-hidden border border-line mb-5"
            style={{ aspectRatio: "4 / 5" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={guest.night.event.flyer_url}
              alt={guest.night.event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="card mb-4">
          {scan ? (
            <>
              <p className="label-mono text-mint mb-1">✓ You attended</p>
              <p className="font-sans text-cream">
                Scanned in at{" "}
                {new Date(scan.scanned_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </>
          ) : (
            <>
              <p className="label-mono text-coral mb-1">No-show</p>
              <p className="font-sans text-cream/80 text-sm">
                We don&apos;t have a record of you scanning in. Talk to the
                host if that&apos;s a mistake.
              </p>
            </>
          )}
        </div>

        <Link href="/discover" className="btn-primary text-center">
          What&apos;s next →
        </Link>

        <p className="label-mono mt-auto pt-8 text-center break-all">
          <span className="text-muted">Token:</span> {guest.check_in_token}
        </p>
      </main>
    );
  }

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
