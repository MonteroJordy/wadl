import Link from "next/link";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { Chip, IconArrow, WFrame, Wordmark } from "@/components/wadl";

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
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <div style={{ padding: "20px 24px 0" }}>
            <Wordmark variant="monogrid" size={18} />
          </div>
          <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
            <div className="w-type-meta">CREDENTIAL</div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 12 }}
            >
              Ticket not found.
            </div>
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)", marginTop: 12 }}
            >
              The link may be wrong or the ticket may have been revoked.
            </p>
            <Link
              href="/mytickets"
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                display: "inline-flex",
                textDecoration: "none",
              }}
            >
              My tickets <IconArrow size={14} />
            </Link>
          </div>
        </WFrame>
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
      <main id="main-content">
        <WFrame style={{ paddingBottom: 32 }}>
          <div
            style={{
              padding: "20px 24px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Link
              href="/mytickets"
              className="w-type-meta"
              style={{ textDecoration: "none" }}
            >
              ← TICKETS
            </Link>
            <Wordmark variant="monogrid" size={16} />
            <Chip tone="ghost">PAST</Chip>
          </div>

          <div style={{ padding: "24px 24px 0" }}>
            <div className="w-type-meta">
              {fmtDate(guest.night.night_date).toUpperCase()} · DOORS{" "}
              {fmtTime(guest.night.doors_at).toUpperCase()}
            </div>
            <div
              className="w-type-display-md"
              style={{ marginTop: 6 }}
            >
              {guest.night.event.name}
            </div>
          </div>

          {guest.night.event.flyer_url && (
            <div style={{ padding: "20px 24px 0" }}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4 / 5",
                  border: "1px solid var(--w-line)",
                  background: "var(--w-surface-2)",
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

          <div style={{ padding: "20px 24px 0" }}>
            <div className="w-card" style={{ padding: 16 }}>
              {scan ? (
                <>
                  <Chip tone="ok">✓ ATTENDED</Chip>
                  <p
                    className="w-type-body-sm"
                    style={{ marginTop: 10 }}
                  >
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
                  <Chip tone="warn">NO-SHOW</Chip>
                  <p
                    className="w-type-body-sm"
                    style={{
                      color: "var(--w-fg-muted)",
                      marginTop: 10,
                    }}
                  >
                    We don&apos;t have a record of you scanning in. Talk to the
                    host if that&apos;s a mistake.
                  </p>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              padding: "20px 24px 0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <Link
              href={`/e/${guest.night.event.id}/feedback?token=${guest.check_in_token}`}
              className="w-btn w-btn--ghost"
              style={{ textDecoration: "none" }}
            >
              Leave feedback
            </Link>
            <Link
              href="/discover"
              className="w-btn w-btn--primary"
              style={{ textDecoration: "none" }}
            >
              What&apos;s next →
            </Link>
          </div>

          <div
            className="w-type-meta"
            style={{
              marginTop: "auto",
              padding: "32px 24px 16px",
              textAlign: "center",
              color: "var(--w-fg-dim)",
              wordBreak: "break-all",
            }}
          >
            TOKEN · {guest.check_in_token}
          </div>
        </WFrame>
      </main>
    );
  }

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 32 }}>
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/mytickets"
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            ← TICKETS
          </Link>
          <Wordmark variant="monogrid" size={16} />
          <Chip
            tone={
              guest.status === "approved"
                ? "ok"
                : guest.status === "pending"
                  ? "warn"
                  : guest.status === "rejected"
                    ? "err"
                    : "ghost"
            }
          >
            {guest.status.toUpperCase()}
          </Chip>
        </div>

        <div style={{ padding: "20px 24px 0" }}>
          <div className="w-type-meta">
            {fmtDate(guest.night.night_date).toUpperCase()} · DOORS{" "}
            {fmtTime(guest.night.doors_at).toUpperCase()}
          </div>
          <div className="w-type-display-md" style={{ marginTop: 6 }}>
            {guest.night.event.name}
          </div>
        </div>

        {/* Big QR */}
        <div style={{ padding: "24px 24px 0" }}>
          <div
            style={{
              aspectRatio: "1 / 1",
              border: "1px solid var(--w-line)",
              background: active ? "var(--w-fg)" : "var(--w-surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: active ? 24 : 32,
            }}
          >
            {active ? (
              <div
                style={{ width: "100%", height: "100%" }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <div
                  className="w-type-meta"
                  style={{ color: "var(--w-warn)" }}
                >
                  PENDING
                </div>
                <div
                  className="w-type-display-md"
                  style={{ marginTop: 8 }}
                >
                  Hold tight.
                </div>
                <p
                  className="w-type-body-sm"
                  style={{
                    color: "var(--w-fg-muted)",
                    marginTop: 12,
                    maxWidth: 240,
                  }}
                >
                  Your QR activates once the host approves this RSVP.
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "20px 24px 0" }}>
          <div className="w-card" style={{ padding: 16 }}>
            <div className="w-type-meta">GUEST</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 17,
                marginTop: 4,
              }}
            >
              {guest.full_name}
              {guest.plus_ones > 0 && (
                <span
                  style={{
                    color: "var(--w-fg-muted)",
                    fontWeight: 400,
                  }}
                >
                  {" "}+{guest.plus_ones}
                </span>
              )}
            </div>
          </div>
        </div>

        {active && (
          <div
            style={{
              padding: "20px 24px 0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <a
              href={`/api/wallet/apple/${guest.check_in_token}`}
              className="w-btn w-btn--ghost"
              style={{ fontSize: 12, textDecoration: "none" }}
            >
              Apple Wallet
            </a>
            <a
              href={`/api/wallet/google/${guest.check_in_token}`}
              className="w-btn w-btn--ghost"
              style={{ fontSize: 12, textDecoration: "none" }}
            >
              Google Wallet
            </a>
          </div>
        )}

        <div
          style={{
            padding: "24px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            textAlign: "center",
          }}
        >
          <a
            href={`/api/events/${guest.night.event.id}/calendar.ics`}
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            + ADD TO CALENDAR
          </a>
          <a
            href={`/referral/${guest.id}`}
            className="w-type-meta"
            style={{ textDecoration: "none" }}
          >
            BRING A FRIEND →
          </a>
        </div>

        <div
          style={{
            marginTop: "auto",
            padding: "32px 24px 16px",
            textAlign: "center",
          }}
        >
          <div className="w-type-meta">SHOW THIS SCREEN AT THE DOOR</div>
          <div
            className="w-type-meta"
            style={{
              marginTop: 12,
              color: "var(--w-fg-dim)",
              wordBreak: "break-all",
              fontSize: 9,
            }}
          >
            {guest.check_in_token}
          </div>
        </div>
      </WFrame>
    </main>
  );
}
