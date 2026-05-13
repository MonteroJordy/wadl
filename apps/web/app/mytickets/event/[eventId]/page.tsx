import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { Button } from "@/components/wadl";

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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href="/mytickets"
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← TICKETS
          </Link>
          <div className="w-type-meta">{tickets.length} NIGHTS</div>
        </div>

        <div className="w-type-display-md" style={{ marginBottom: 4 }}>
          {event.name}
        </div>
        <div
          className="w-type-meta"
          style={{ color: "var(--w-fg-muted)", marginBottom: 24 }}
        >
          MULTI-NIGHT PASS
        </div>

        {event.flyer_url && (
          <div
            style={{
              width: "100%",
              overflow: "hidden",
              border: "1px solid var(--w-line)",
              marginBottom: 20,
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
            gap: 16,
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {tickets.map((t, i) => {
            const active = t.status === "approved";
            const statusColor = active
              ? "var(--w-ok)"
              : t.status === "pending"
                ? "var(--w-warn)"
                : "var(--w-fg-muted)";
            return (
              <li key={t.id} className="w-card" style={{ padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <p
                    style={{ color: "var(--w-fg)", fontWeight: 600 }}
                  >
                    {fmtDate(t.night.night_date)}
                  </p>
                  <div
                    className="w-type-meta"
                    style={{ color: statusColor }}
                  >
                    {t.status.toUpperCase()}
                  </div>
                </div>
                <div
                  className="w-type-meta"
                  style={{ marginBottom: 12 }}
                >
                  DOORS {fmtTime(t.night.doors_at).toUpperCase()} ·{" "}
                  {t.tier.toUpperCase()}
                  {t.plus_ones > 0 && ` · +${t.plus_ones}`}
                </div>
                <div
                  style={{
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active
                      ? "var(--w-fg)"
                      : "var(--w-surface-2)",
                    border: active ? "none" : "1px solid var(--w-line)",
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
                      style={{
                        fontFamily: "var(--w-display)",
                        fontWeight: 700,
                        fontSize: 30,
                        color: "var(--w-warn)",
                      }}
                    >
                      PENDING
                    </div>
                  )}
                </div>
                <Link
                  href={`/t/${t.check_in_token}`}
                  style={{
                    textDecoration: "none",
                    display: "block",
                    marginTop: 12,
                  }}
                >
                  <Button
                    variant="ghost"
                    style={{ width: "100%", fontSize: 12 }}
                  >
                    Open standalone
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>

        <div
          className="w-type-meta"
          style={{
            marginTop: 32,
            textAlign: "center",
            color: "var(--w-fg-muted)",
          }}
        >
          SHOW THE RIGHT NIGHT&apos;S QR AT THE DOOR.
        </div>
      </div>
    </main>
  );
}
