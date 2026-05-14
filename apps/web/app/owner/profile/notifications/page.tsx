import { requireOwnerContext } from "@/lib/owner";
import { Breadcrumb, PageHeader } from "@/components/v5";
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
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[["Profile", "/owner/profile"], "Notifications"]}
      />
      <PageHeader
        eyebrow="Settings · notifications"
        title="Notifications"
        sub="Channel + per-kind controls. Quiet hours pause push + SMS while keeping the inbox up to date."
      />

      <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
        <NotifPrefsForm initial={prefs} />
      </div>
    </main>
  );
}
