import { createAdminClient } from "@/lib/supabase/admin";
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
      "id, action, context, created_at, actor:profiles!actor_user_id(full_name), event:events(name)"
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
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Platform activity log</h1>
      <p className="label-mono mb-6">
        Cross-account audit_log stream. Most recent 200 rows.
      </p>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {FILTERS.map((a) => (
          <a
            key={a || "all"}
            href={a ? `/admin/activity?action=${a}` : "/admin/activity"}
            className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              (filter || "") === a
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            {a || "all"}
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
    </main>
  );
}
