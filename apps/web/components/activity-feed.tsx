interface FeedRow {
  id: string;
  action: string;
  context: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null } | null;
  event?: { name: string } | null;
  guest?: { full_name: string } | null;
}

const ACTION_LABEL: Record<string, string> = {
  "door.scanned_in": "Scanned in",
  "door.blocked_dna": "Blocked (DNA)",
  "guest.rsvp": "RSVP'd",
  "holder.add_guest": "Holder added",
  "guests.csv_import": "CSV import",
  "guest.tier_upgraded": "Tier upgraded",
  "guest.flag_dna": "Flagged DNA",
  "guest.unflag_dna": "Unflagged",
  "owner.override_admit": "Override admit",
  "capacity.lockdown": "⚠ LOCKDOWN",
  "broadcast.sms": "SMS broadcast",
  "chathub_add": "Chat Hub committed",
  "event.cloned": "Event cloned",
  "co_owner.removed": "Co-owner removed",
  "platform.force_flag": "Platform force-flag",
  "staff.invite_accepted": "Staff joined",
  "holder.claimed_allocation": "Holder claimed",
  "referral.add_guest": "Referral",
  "sms.opted_out": "SMS opted-out",
  "sms.opted_in": "SMS opted-in",
};

const ACTION_TONE: Record<string, string> = {
  "door.scanned_in": "border-mint/30 text-mint",
  "door.blocked_dna": "border-coral/40 text-coral",
  "guest.rsvp": "border-cream/20 text-cream",
  "holder.add_guest": "border-cream/20 text-cream",
  "guest.tier_upgraded": "border-mint/30 text-mint",
  "guest.flag_dna": "border-coral/40 text-coral",
  "owner.override_admit": "border-coral/40 text-coral",
  "capacity.lockdown": "border-coral/60 text-coral",
};

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

function rowSubject(r: FeedRow): string {
  if (r.guest?.full_name) return r.guest.full_name;
  if (r.context && typeof r.context === "object") {
    const ctx = r.context as Record<string, unknown>;
    if (typeof ctx.full_name === "string") return ctx.full_name;
  }
  if (r.event?.name) return r.event.name;
  return "";
}

export default function ActivityFeed({
  rows,
  showEvent,
  emptyTitle,
  emptyBody,
}: {
  rows: FeedRow[];
  showEvent?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card text-center">
        <p className="label-mono mb-1">
          {emptyTitle ?? "Nothing yet"}
        </p>
        <p className="text-muted text-sm">
          {emptyBody ??
            "Activity from holders, the door, and the queue will land here as it happens."}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => {
        const label = ACTION_LABEL[r.action] ?? r.action.replace(/[._]/g, " ");
        const tone = ACTION_TONE[r.action] ?? "border-line text-muted";
        const subject = rowSubject(r);
        return (
          <li
            key={r.id}
            className={`flex items-baseline gap-2 px-3 py-2 rounded border ${tone} bg-s1`}
          >
            <span className="label-mono shrink-0">{ago(r.created_at)}</span>
            <span className="label-mono shrink-0 hidden sm:inline">·</span>
            <span className="label-mono shrink-0">{label}</span>
            {subject && (
              <>
                <span className="label-mono shrink-0">·</span>
                <span className="font-sans text-cream text-sm truncate">
                  {subject}
                </span>
              </>
            )}
            {showEvent && r.event?.name && (
              <span className="label-mono ml-auto shrink-0 truncate max-w-[40%]">
                {r.event.name}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
