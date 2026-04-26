import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your tickets — WADL" };

interface TicketRow {
  id: string;
  full_name: string;
  status: string;
  tier: string;
  plus_ones: number;
  check_in_token: string;
  night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; flyer_url: string | null };
  };
}

export default async function MultiNightTicketsPage({
  params,
}: {
  params: { eventId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.phone) redirect("/mytickets");

  const phone = user.phone.startsWith("+") ? user.phone : `+${user.phone}`;
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from("guests")
    .select(
      "id, full_name, status, tier, plus_ones, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, flyer_url))"
    )
    .eq("phone", phone)
    .not("check_in_token", "is", null);

  const tickets = ((rowsRaw ?? []) as unknown as TicketRow[]).filter(
    (t) => t.night.event.id === params.eventId
  );

  if (tickets.length === 0) notFound();

  const event = tickets[0].night.event;
  tickets.sort((a, b) => (a.night.doors_at < b.night.doors_at ? -1 : 1));

  // Pre-render each QR.
  const qrSvgs = await Promise.all(
    tickets.map((t) =>
      QRCode.toString(t.check_in_token, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 1,
        color: { dark: "#0a0a0a", light: "#F2EDE4" },
      })
    )
  );

  return (
    <main id="main-content" className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href="/mytickets" className="label-mono hover:text-cream">
          ← Tickets
        </Link>
        <p className="label-mono">{tickets.length} nights</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-1">{event.name}</h1>
      <p className="label-mono mb-6">Multi-night pass</p>

      {event.flyer_url && (
        <div
          className="w-full rounded-lg overflow-hidden border border-line mb-5"
          style={{ aspectRatio: "4 / 5" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.flyer_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {tickets.map((t, i) => {
          const active = t.status === "approved";
          return (
            <li key={t.id} className="card">
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-sans text-cream font-semibold">
                  {fmtDate(t.night.night_date)}
                </p>
                <span
                  className={`label-mono ${
                    active
                      ? "text-mint"
                      : t.status === "pending"
                      ? "text-gold"
                      : "text-muted"
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="label-mono mb-3">
                Doors {fmtTime(t.night.doors_at)} · {t.tier.toUpperCase()}
                {t.plus_ones > 0 && ` · +${t.plus_ones}`}
              </p>
              <div
                className={`rounded-lg p-3 flex items-center justify-center ${
                  active ? "bg-cream" : "bg-s2 border border-line"
                }`}
                style={{ aspectRatio: "1 / 1", maxWidth: 240, margin: "0 auto" }}
              >
                {active ? (
                  <div
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvgs[i] }}
                  />
                ) : (
                  <p className="font-display text-3xl text-gold">PENDING</p>
                )}
              </div>
              <Link
                href={`/t/${t.check_in_token}`}
                className="btn-ghost text-center text-xs mt-3 block"
              >
                Open standalone
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="label-mono mt-auto pt-8 text-center">
        Show the right night&apos;s QR at the door.
      </p>
    </main>
  );
}
