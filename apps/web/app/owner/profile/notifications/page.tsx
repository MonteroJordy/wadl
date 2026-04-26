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
    ((profile as unknown as { notif_prefs: NotifPrefs | null }).notif_prefs) ??
    DEFAULT_PREFS;

  return (
    <main
      id="main-content"
      className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12"
    >
      <header className="mb-6">
        <Link href="/owner/profile" className="label-mono hover:text-cream">
          ← Profile
        </Link>
        <h1 className="display-lg mt-3 mb-2">Notification preferences</h1>
        <p className="label-mono">
          Channel + per-kind controls. Quiet hours pause push + SMS while
          keeping the inbox up to date.
        </p>
      </header>

      <NotifPrefsForm initial={prefs} />
    </main>
  );
}
