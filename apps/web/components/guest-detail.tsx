import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/format";
import { Button } from "@/components/wadl";
import FlagDnaForm from "@/components/flag-dna-form";
import GuestCancelButton from "@/components/guest-cancel-button";
import GuestNotesTags from "@/components/guest-notes-tags";
import TierUpgradeButton from "@/components/tier-upgrade-button";
import GuestDmButton from "@/components/guest-dm-button";

interface GuestDetailData {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  plus_ones: number;
  tier: string;
  status: string;
  flag_dna: boolean;
  flag_reason: string | null;
  sms_opted_out?: boolean;
  check_in_token: string | null;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
  tags: string[];
  allocation: { holder_name: string } | null;
  night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string };
  };
  check_ins: Array<{
    state: string;
    scanned_at: string;
    scanner: { full_name: string | null } | null;
  }>;
  referred_count?: number;
}

const STATUS_COLOR: Record<string, string> = {
  approved: "var(--w-ok)",
  pending: "var(--w-warn)",
  rejected: "var(--w-err)",
};

const SCAN_COLOR: Record<string, string> = {
  approved: "var(--w-ok)",
  do_not_admit: "var(--w-err)",
};

export default function GuestDetail({
  guest,
  backHref,
  accent,
  label,
}: {
  guest: GuestDetailData;
  backHref: string;
  // accent prop kept for API compat — v3 collapses both to --w-acc.
  accent?: "coral" | "gold";
  label: string;
}) {
  void accent;

  return (
    <main
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
            href={backHref}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta" style={{ color: "var(--w-acc)" }}>
            {label.toUpperCase()}
          </div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">{guest.full_name}</div>
          <p
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            {guest.night.event.name.toUpperCase()} ·{" "}
            {fmtDate(guest.night.night_date).toUpperCase()} · DOORS{" "}
            {fmtTime(guest.night.doors_at).toUpperCase()}
          </p>
        </div>

        <section
          className="w-card"
          style={{ padding: 16, marginBottom: 12 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div>
              <div className="w-type-meta">STATUS</div>
              <p
                style={{
                  fontWeight: 600,
                  color: STATUS_COLOR[guest.status] ?? "var(--w-fg)",
                  marginTop: 4,
                }}
              >
                {guest.status.toUpperCase()}
              </p>
            </div>
            <div>
              <div className="w-type-meta">TIER</div>
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--w-fg)",
                  marginTop: 4,
                }}
              >
                {guest.tier.replace("_", " ").toUpperCase()}
              </p>
            </div>
            <div>
              <div className="w-type-meta">+1S</div>
              <p style={{ color: "var(--w-fg)", marginTop: 4 }}>
                {guest.plus_ones}
              </p>
            </div>
            <div>
              <div className="w-type-meta">ALLOCATION</div>
              <p
                style={{
                  color: "var(--w-fg)",
                  marginTop: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {guest.allocation?.holder_name ?? "—"}
              </p>
            </div>
          </div>

          {(guest.phone || guest.email) && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--w-line)",
              }}
            >
              {guest.phone && (
                <div className="w-type-meta" style={{ marginBottom: 4 }}>
                  <span style={{ color: "var(--w-fg-muted)" }}>PHONE</span>{" "}
                  <span style={{ color: "var(--w-fg)" }}>{guest.phone}</span>
                </div>
              )}
              {guest.email && (
                <div
                  className="w-type-meta"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span style={{ color: "var(--w-fg-muted)" }}>EMAIL</span>{" "}
                  <span style={{ color: "var(--w-fg)" }}>{guest.email}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {(guest.referred_count ?? 0) > 0 && (
          <section
            className="w-card"
            style={{
              padding: 16,
              marginBottom: 12,
              borderColor: "var(--w-acc)",
            }}
          >
            <div className="w-type-meta">REFERRALS</div>
            <p style={{ color: "var(--w-fg)", marginTop: 6 }}>
              Brought{" "}
              <span
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--w-acc)",
                }}
              >
                {guest.referred_count}
              </span>{" "}
              friend{guest.referred_count === 1 ? "" : "s"}
            </p>
          </section>
        )}

        <section
          className="w-card"
          style={{ padding: 16, marginBottom: 12 }}
        >
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            DOOR HISTORY
          </div>
          {guest.check_ins.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              No scans yet.
            </p>
          ) : (
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {guest.check_ins.map((c, i) => (
                <li key={i} className="w-type-meta">
                  <span
                    style={{
                      color: SCAN_COLOR[c.state] ?? "var(--w-fg-muted)",
                    }}
                  >
                    {c.state.toUpperCase()}
                  </span>
                  {" · "}
                  {new Date(c.scanned_at).toLocaleTimeString().toUpperCase()}
                  {c.scanner?.full_name
                    ? ` · ${c.scanner.full_name.toUpperCase()}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ marginBottom: 12 }}>
          <TierUpgradeButton
            guestId={guest.id}
            currentTier={guest.tier}
          />
        </section>

        <section style={{ marginBottom: 12 }}>
          <GuestNotesTags
            guestId={guest.id}
            initialNotes={guest.notes ?? ""}
            initialTags={guest.tags ?? []}
          />
        </section>

        <section style={{ marginBottom: 12 }}>
          <FlagDnaForm
            guestId={guest.id}
            initialFlagged={guest.flag_dna}
            initialReason={guest.flag_reason ?? ""}
          />
        </section>

        <section style={{ marginBottom: 12 }}>
          <GuestDmButton
            guestId={guest.id}
            guestName={guest.full_name}
            hasPhone={!!guest.phone}
            optedOut={!!guest.sms_opted_out}
          />
        </section>

        <section style={{ marginBottom: 16 }}>
          <GuestCancelButton
            eventId={guest.night.event.id}
            guestId={guest.id}
            status={guest.status}
          />
        </section>

        {guest.check_in_token && (
          <Link
            href={`/t/${guest.check_in_token}`}
            style={{ textDecoration: "none", display: "block" }}
          >
            <Button variant="ghost" style={{ width: "100%" }}>
              Open guest QR
            </Button>
          </Link>
        )}

        <Link
          href={`/owner/events/${guest.night.event.id}/guests/${guest.id}/history`}
          className="w-type-meta"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 16,
            color: "var(--w-acc)",
            textDecoration: "none",
          }}
        >
          TIER + FLAG HISTORY →
        </Link>
      </div>
    </main>
  );
}
