import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import NotifPrefsForm from "./prefs-form";
import type { NotifPrefs } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications — WADL" };

const DEFAULT_PREFS: NotifPrefs = {
  channels: { push: true, email: true, sms: false },
  kinds: {
    rsvp_pending: true,
    capacity_alert: true,
    staff_assigned: true,
    billing_event: true,
    co_owner_accepted: true,
    scan_failure_high: true,
    waitlist_promoted: true,
    referral_arrived: true,
    guest_flagged: true,
    tier_upgraded: false,
    broadcast_sent: false,
  },
  quiet_hours: { enabled: false, start: "02:00", end: "10:00" },
};

export default async function NotifPrefsPage() {
  const { profile } = await requireOwnerContext();
  const prefs =
    (profile as unknown as { notif_prefs: NotifPrefs | null }).notif_prefs ??
    DEFAULT_PREFS;

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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/owner/profile"
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← PROFILE
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">NOTIFICATIONS</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Notification preferences
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Channel + per-kind controls. Quiet hours pause push + SMS while
            keeping the inbox up to date.
          </p>
        </div>

        <NotifPrefsForm initial={prefs} />
      </div>
    </main>
  );
}
