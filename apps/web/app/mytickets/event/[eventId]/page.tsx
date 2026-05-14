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
      "id, full_name, status, tier, plus_ones, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, flyer_url))",
    )
    .eq("phone", phone)
    .not("check_in_token", "is", null);

  const tickets = ((rowsRaw ?? []) as unknown as TicketRow[]).filter(
    (t) => t.night.event.id === params.eventId,
  );

  if (tickets.length === 0) notFound();

  const event = tickets[0].night.event;
  tickets.sort((a, b) => (a.night.doors_at < b.night.doors_at ? -1 : 1));

  const qrSvgs = await Promise.all(
    tickets.map((t) =>
      QRCode.toString(t.check_in_token, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 1,
        color: { dark: "#0a0a0a", light: "#f3f1ec" },
      }),
    ),
  );

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-6) var(--s-24)",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--s-4)",
          }}
        >
          <Link
            href="/mytickets"
            className="t-meta"
            style={{ color: "var(--fg-3)", textDecoration: "none" }}
          >
            ← Tickets
          </Link>
          <div className="t-meta">{tickets.length} nights</div>
        </div>

        <div className="t-display-md" style={{ marginBottom: "var(--s-1)" }}>
          {event.name}
        </div>
        <div
          className="t-meta"
          style={{ marginBottom: "var(--s-6)" }}
        >
          Multi-night pass
        </div>

        {event.flyer_url && (
          <div
            style={{
              width: "100%",
              overflow: "hidden",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              marginBottom: "var(--s-5)",
              aspectRatio: "4 / 5",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.flyer_url}
              alt={event.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-4)",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {tickets.map((t, i) => {
            const active = t.status === "approved";
            const chipClass = active
              ? "chip chip--ok"
              : t.status === "pending"
                ? "chip chip--warn"
                : "chip";
            return (
              <li
                key={t.id}
                className="card"
                style={{ padding: "var(--s-4)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "var(--s-2)",
                  }}
                >
                  <p className="t-h2">{fmtDate(t.night.night_date)}</p>
                  <span className={chipClass}>{t.status}</span>
                </div>
                <div
                  className="t-meta"
                  style={{ marginBottom: "var(--s-3)" }}
                >
                  Doors {fmtTime(t.night.doors_at)} · {t.tier.toUpperCase()}
                  {t.plus_ones > 0 && ` · +${t.plus_ones}`}
                </div>
                <div
                  style={{
                    padding: "var(--s-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? "#f3f1ec" : "var(--bg-3)",
                    border: active ? "none" : "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    aspectRatio: "1 / 1",
                    maxWidth: 240,
                    margin: "0 auto",
                  }}
                >
                  {active ? (
                    <div
                      style={{ width: "100%", height: "100%" }}
                      dangerouslySetInnerHTML={{ __html: qrSvgs[i] }}
                    />
                  ) : (
                    <div
                      className="t-display-sm"
                      style={{ color: "var(--warn)" }}
                    >
                      Pending
                    </div>
                  )}
                </div>
                <Link
                  href={`/t/${t.check_in_token}`}
                  className="btn btn--ghost btn--block"
                  style={{
                    textDecoration: "none",
                    marginTop: "var(--s-3)",
                  }}
                >
                  Open standalone
                </Link>
              </li>
            );
          })}
        </ul>

        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-8)",
            textAlign: "center",
            color: "var(--fg-3)",
          }}
        >
          Show the right night&apos;s QR at the door.
        </div>
      </div>
    </main>
  );
}
