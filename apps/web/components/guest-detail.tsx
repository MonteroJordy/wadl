import Link from "next/link";
import { fmtDate, fmtTime } from "@/lib/format";
import FlagDnaForm from "@/components/flag-dna-form";
import GuestCancelButton from "@/components/guest-cancel-button";
import GuestNotesTags from "@/components/guest-notes-tags";
import TierUpgradeButton from "@/components/tier-upgrade-button";

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

export default function GuestDetail({
  guest,
  backHref,
  accent,
  label,
}: {
  guest: GuestDetailData;
  backHref: string;
  accent: "coral" | "gold";
  label: string;
}) {
  const approvedScan = guest.check_ins.find((c) => c.state === "approved");
  const dnaScan = guest.check_ins.find((c) => c.state === "do_not_admit");
  const accentText = accent === "gold" ? "text-gold" : "text-coral";

  const statusColor =
    guest.status === "approved"
      ? "text-mint"
      : guest.status === "pending"
      ? "text-gold"
      : guest.status === "rejected"
      ? "text-coral"
      : "text-muted";

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link href={backHref} className="label-mono hover:text-cream">
          ← Back
        </Link>
        <p className={`label-mono ${accentText}`}>{label}</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-1">{guest.full_name}</h1>
      <p className="label-mono mb-6">
        {guest.night.event.name} · {fmtDate(guest.night.night_date)} · Doors{" "}
        {fmtTime(guest.night.doors_at)}
      </p>

      <section className="card mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label-mono">Status</p>
            <p className={`font-sans font-semibold ${statusColor}`}>
              {guest.status}
            </p>
          </div>
          <div>
            <p className="label-mono">Tier</p>
            <p className="font-sans font-semibold text-cream">
              {guest.tier.replace("_", " ").toUpperCase()}
            </p>
          </div>
          <div>
            <p className="label-mono">+1s</p>
            <p className="font-sans text-cream">{guest.plus_ones}</p>
          </div>
          <div>
            <p className="label-mono">Allocation</p>
            <p className="font-sans text-cream truncate">
              {guest.allocation?.holder_name ?? "—"}
            </p>
          </div>
        </div>

        {(guest.phone || guest.email) && (
          <div className="mt-4 pt-4 border-t border-line">
            {guest.phone && (
              <p className="label-mono mb-1">
                <span className="text-muted">Phone</span>{" "}
                <span className="text-cream">{guest.phone}</span>
              </p>
            )}
            {guest.email && (
              <p className="label-mono truncate">
                <span className="text-muted">Email</span>{" "}
                <span className="text-cream">{guest.email}</span>
              </p>
            )}
          </div>
        )}
      </section>

      {(guest.referred_count ?? 0) > 0 && (
        <section className="card mb-4 border-coral/30">
          <p className="label-mono mb-1">Referrals</p>
          <p className="font-sans text-cream">
            Brought <span className="font-display text-2xl text-coral">{guest.referred_count}</span> friend
            {guest.referred_count === 1 ? "" : "s"}
          </p>
        </section>
      )}

      <section className="card mb-4">
        <p className="label-mono mb-2">Door history</p>
        {guest.check_ins.length === 0 ? (
          <p className="text-muted text-sm">No scans yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {guest.check_ins.map((c, i) => {
              const color =
                c.state === "approved"
                  ? "text-mint"
                  : c.state === "do_not_admit"
                  ? "text-coral"
                  : "text-muted";
              return (
                <li key={i} className="label-mono">
                  <span className={color}>{c.state}</span>
                  {" · "}
                  {new Date(c.scanned_at).toLocaleTimeString()}
                  {c.scanner?.full_name ? ` · ${c.scanner.full_name}` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <TierUpgradeButton
          guestId={guest.id}
          currentTier={guest.tier}
        />
      </section>

      <section className="mb-4">
        <GuestNotesTags
          guestId={guest.id}
          initialNotes={guest.notes ?? ""}
          initialTags={guest.tags ?? []}
        />
      </section>

      <section className="mb-4">
        <FlagDnaForm
          guestId={guest.id}
          initialFlagged={guest.flag_dna}
          initialReason={guest.flag_reason ?? ""}
        />
      </section>

      <section className="mb-4">
        <GuestCancelButton
          eventId={guest.night.event.id}
          guestId={guest.id}
          status={guest.status}
        />
      </section>

      {guest.check_in_token && (
        <Link
          href={`/t/${guest.check_in_token}`}
          className="btn-ghost block text-center"
        >
          Open guest QR
        </Link>
      )}

      <Link
        href={`/owner/events/${guest.night.event.id}/guests/${guest.id}/history`}
        className="label-mono block text-center mt-4 hover:text-cream"
      >
        Tier + flag history →
      </Link>
    </main>
  );
}
