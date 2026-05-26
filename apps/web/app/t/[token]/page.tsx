import Link from "next/link";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { Logo } from "@/components/v5";

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

export default async function TicketPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();

  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, flyer_url))",
    )
    .eq("check_in_token", params.token)
    .maybeSingle<TicketData>();

  if (!guest) {
    return (
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
          <Logo size={18} />
        </div>
        <div
          style={{
            padding: "var(--s-24) var(--s-6) 0",
            textAlign: "center",
            maxWidth: 420,
            margin: "0 auto",
          }}
        >
          <div className="t-meta">Credential</div>
          <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
            Ticket not found.
          </div>
          <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
            The link may be wrong or the ticket may have been revoked.
          </p>
          <Link
            href="/mytickets"
            className="btn btn--accent"
            style={{
              marginTop: "var(--s-6)",
              textDecoration: "none",
            }}
          >
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
    color: { dark: "#0a0a0b", light: "#f3f1ec" },
  });

  const active = guest.status === "approved";
  const isPast =
    new Date(guest.night.doors_at).getTime() < Date.now() - 6 * 60 * 60_000;

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
      <main
        id="main-content"
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <div
          style={{
            padding: "var(--s-6) var(--s-6) 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/mytickets"
            className="t-meta"
            style={{ textDecoration: "none" }}
          >
            ← Tickets
          </Link>
          <Logo size={16} />
          <span className="chip chip--ghost">Past</span>
        </div>

        <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
          <div className="t-meta">
            {fmtDate(guest.night.night_date)} · Doors{" "}
            {fmtTime(guest.night.doors_at)}
          </div>
          <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
            {guest.night.event.name}
          </div>
        </div>

        {guest.night.event.flyer_url && (
          <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 5",
                borderRadius: "var(--r-lg)",
                border: "1px solid var(--line)",
                background: "var(--bg-3)",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guest.night.event.flyer_url}
                alt={guest.night.event.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        )}

        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <div className="card" style={{ padding: "var(--s-4)" }}>
            {scan ? (
              <>
                <span className="chip chip--ok">Attended</span>
                <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
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
                <span className="chip chip--warn">No-show</span>
                <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
                  We don&apos;t have a record of you scanning in. Talk to the
                  host if that&apos;s a mistake.
                </p>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "var(--s-5) var(--s-6) 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-2)",
          }}
        >
          <Link
            href={`/e/${guest.night.event.id}/feedback?token=${guest.check_in_token}`}
            className="btn btn--ghost"
            style={{ textDecoration: "none" }}
          >
            Leave feedback
          </Link>
          <Link
            href="/discover"
            className="btn"
            style={{ textDecoration: "none" }}
          >
            What&apos;s next
          </Link>
        </div>

        <div
          className="t-meta"
          style={{
            padding: "var(--s-8) var(--s-6) var(--s-4)",
            textAlign: "center",
            wordBreak: "break-all",
          }}
        >
          Token · {guest.check_in_token}
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div
        style={{
          padding: "var(--s-6) var(--s-6) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/mytickets"
          className="t-meta"
          style={{ textDecoration: "none" }}
        >
          ← Tickets
        </Link>
        <Logo size={16} />
        <span
          className={
            "chip " +
            (guest.status === "approved"
              ? "chip--ok"
              : guest.status === "pending"
                ? "chip--warn"
                : guest.status === "rejected"
                  ? "chip--err"
                  : "chip--ghost")
          }
        >
          {guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
        </span>
      </div>

      <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
        <div className="t-meta">
          {fmtDate(guest.night.night_date)} · Doors{" "}
          {fmtTime(guest.night.doors_at)}
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          {guest.night.event.name}
        </div>
      </div>

      {/* Big QR */}
      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div
          style={{
            aspectRatio: "1 / 1",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--line)",
            background: active ? "var(--fg)" : "var(--bg-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: active ? "var(--s-6)" : "var(--s-8)",
          }}
        >
          {active ? (
            <div
              style={{ width: "100%", height: "100%" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div className="t-meta" style={{ color: "var(--warn)" }}>
                Pending
              </div>
              <div
                className="t-display-md"
                style={{ marginTop: "var(--s-2)" }}
              >
                Hold tight.
              </div>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)", maxWidth: 240 }}
              >
                Your QR activates once the host approves this RSVP.
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
        <div className="card" style={{ padding: "var(--s-4)" }}>
          <div className="t-meta">Guest</div>
          <div className="t-h1" style={{ marginTop: "var(--s-1)" }}>
            {guest.full_name}
            {guest.plus_ones > 0 && (
              <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>
                {" "}
                +{guest.plus_ones}
              </span>
            )}
          </div>
        </div>
      </div>

      {active && (
        <div
          style={{
            padding: "var(--s-5) var(--s-6) 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-2)",
          }}
        >
          <a
            href={`/api/wallet/apple/${guest.check_in_token}`}
            className="btn btn--ghost"
            style={{ textDecoration: "none" }}
          >
            Apple Wallet
          </a>
          <a
            href={`/api/wallet/google/${guest.check_in_token}`}
            className="btn btn--ghost"
            style={{ textDecoration: "none" }}
          >
            Google Wallet
          </a>
        </div>
      )}

      <div
        style={{
          padding: "var(--s-6) var(--s-6) 0",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-2)",
          textAlign: "center",
        }}
      >
        <a
          href={`/api/events/${guest.night.event.id}/calendar.ics`}
          className="t-meta"
          style={{ textDecoration: "none" }}
        >
          + Add to calendar
        </a>
        <a
          href={`/referral/${guest.id}`}
          className="t-meta"
          style={{ textDecoration: "none" }}
        >
          Bring a friend →
        </a>
      </div>

      <div
        style={{
          padding: "var(--s-8) var(--s-6) var(--s-4)",
          textAlign: "center",
        }}
      >
        <div className="t-meta">Show this screen at the door</div>
        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-3)",
            color: "var(--fg-4)",
            wordBreak: "break-all",
            fontSize: 9,
          }}
        >
          {guest.check_in_token}
        </div>
      </div>
    </main>
  );
}
