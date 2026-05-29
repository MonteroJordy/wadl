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

const ACTION_COLOR: Record<string, string> = {
  "door.scanned_in": "var(--w-ok)",
  "door.blocked_dna": "var(--w-err)",
  "guest.tier_upgraded": "var(--w-ok)",
  "guest.flag_dna": "var(--w-err)",
  "owner.override_admit": "var(--w-err)",
  "capacity.lockdown": "var(--w-err)",
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
      <div
        className="w-card"
        style={{ padding: 16, textAlign: "center" }}
      >
        <div className="w-type-meta" style={{ marginBottom: 4 }}>
          {(emptyTitle ?? "Nothing yet").toUpperCase()}
        </div>
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-fg-muted)" }}
        >
          {emptyBody ??
            "Activity from holders, the door, and the queue will land here as it happens."}
        </p>
      </div>
    );
  }

  return (
    <ul
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {rows.map((r) => {
        const label = ACTION_LABEL[r.action] ?? r.action.replace(/[._]/g, " ");
        const color = ACTION_COLOR[r.action] ?? "var(--w-fg-muted)";
        const subject = rowSubject(r);
        return (
          <li
            key={r.id}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              padding: "8px 12px",
              border: `1px solid ${color === "var(--w-fg-muted)" ? "var(--w-line)" : color}`,
              background: "var(--w-surface-1)",
              color,
            }}
          >
            <span
              className="w-type-meta"
              style={{ flexShrink: 0 }}
            >
              {ago(r.created_at).toUpperCase()}
            </span>
            <span
              className="w-type-meta"
              style={{ flexShrink: 0 }}
            >
              ·
            </span>
            <span
              className="w-type-meta"
              style={{ flexShrink: 0 }}
            >
              {label.toUpperCase()}
            </span>
            {subject && (
              <>
                <span
                  className="w-type-meta"
                  style={{ flexShrink: 0 }}
                >
                  ·
                </span>
                <span
                  style={{
                    color: "var(--w-fg)",
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {subject}
                </span>
              </>
            )}
            {showEvent && r.event?.name && (
              <span
                className="w-type-meta"
                style={{
                  marginLeft: "auto",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "40%",
                }}
              >
                {r.event.name.toUpperCase()}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
