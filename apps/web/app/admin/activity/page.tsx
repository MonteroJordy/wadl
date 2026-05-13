import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/wadl";
import ActivityFeed from "@/components/activity-feed";

export const dynamic = "force-dynamic";

interface RawRow {
  id: string;
  action: string;
  context: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null } | null;
  event: { name: string } | null;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: { action?: string };
}) {
  const filter = searchParams.action ?? "";
  const admin = createAdminClient();

  let query = admin
    .from("audit_log")
    .select(
      "id, action, context, created_at, actor:profiles!actor_user_id(full_name), event:events(name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter) query = query.eq("action", filter);
  const { data } = await query;
  const rows = (data ?? []) as unknown as RawRow[];

  const FILTERS = [
    "",
    "door.scanned_in",
    "guest.rsvp",
    "holder.add_guest",
    "owner.override_admit",
    "capacity.lockdown",
    "guest.flag_dna",
  ];

  return (
    <main id="main-content" style={{ padding: "32px 24px 96px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">PLATFORM</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Activity log
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Cross-account audit_log stream. Most recent 200 rows.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            marginBottom: 16,
          }}
        >
          {FILTERS.map((a) => (
            <a
              key={a || "all"}
              href={a ? `/admin/activity?action=${a}` : "/admin/activity"}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <Chip tone={(filter || "") === a ? "acc" : "ghost"}>
                {(a || "ALL").toUpperCase()}
              </Chip>
            </a>
          ))}
        </div>

        <ActivityFeed
          rows={rows}
          showEvent
          emptyTitle="Nothing yet"
          emptyBody={
            filter
              ? `No activity rows match action='${filter}'.`
              : "No platform activity yet."
          }
        />
      </div>
    </main>
  );
}
