import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface AuditRow {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_allocation_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  context: unknown;
}

function fmtTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncateJson(obj: unknown): string {
  if (obj === null || obj === undefined) return "";
  const s = JSON.stringify(obj);
  if (s.length <= 80) return s;
  return s.slice(0, 77) + "…";
}

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string; action?: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const actionFilter = searchParams.action ?? "";

  const admin = createAdminClient();

  // Distinct actions for the filter dropdown. Cap at 500 rows so we don't
  // over-fetch on huge event logs — that covers well more than the ~12
  // action types the app currently emits.
  const { data: distinctRows } = await admin
    .from("audit_log")
    .select("action")
    .eq("event_id", event.id)
    .order("action")
    .limit(500);
  const distinctActions = [
    ...new Set(((distinctRows ?? []) as Array<{ action: string }>).map((r) => r.action)),
  ];

  // Count for pagination total.
  const countQuery = admin
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);
  const { count: totalCount } = await (actionFilter
    ? countQuery.eq("action", actionFilter)
    : countQuery);

  // Page query.
  const pageQuery = admin
    .from("audit_log")
    .select(
      "id, created_at, actor_user_id, actor_allocation_id, action, entity_type, entity_id, context"
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const { data: rowsData } = await (actionFilter
    ? pageQuery.eq("action", actionFilter)
    : pageQuery);
  const rows = (rowsData ?? []) as AuditRow[];

  // Resolve actor names in one lookup.
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_user_id).filter(Boolean) as string[]),
  ];
  const allocIds = [
    ...new Set(rows.map((r) => r.actor_allocation_id).filter(Boolean) as string[]),
  ];

  const [actorsRes, allocsRes] = await Promise.all([
    actorIds.length
      ? admin.from("profiles").select("id, full_name").in("id", actorIds)
      : Promise.resolve({ data: [] }),
    allocIds.length
      ? admin.from("allocations").select("id, holder_name").in("id", allocIds)
      : Promise.resolve({ data: [] }),
  ]);

  const actorName = new Map<string, string>();
  for (const p of (actorsRes.data ?? []) as Array<{
    id: string;
    full_name: string | null;
  }>) {
    actorName.set(p.id, p.full_name ?? "Unnamed");
  }
  const allocName = new Map<string, string>();
  for (const a of (allocsRes.data ?? []) as Array<{
    id: string;
    holder_name: string;
  }>) {
    allocName.set(a.id, a.holder_name);
  }

  const total = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const eventId = event.id;

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (p !== 1) sp.set("page", String(p));
    if (actionFilter) sp.set("action", actionFilter);
    const q = sp.toString();
    return `/owner/events/${eventId}/audit${q ? `?${q}` : ""}`;
  }

  function filterHref(a: string) {
    const sp = new URLSearchParams();
    if (a) sp.set("action", a);
    const q = sp.toString();
    return `/owner/events/${eventId}/audit${q ? `?${q}` : ""}`;
  }

  return (
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream"
        >
          ← Back
        </Link>
        <p className="label-mono">Audit log</p>
      </header>

      <h1 className="display-lg mb-2">{event.name}</h1>
      <p className="label-mono mb-4">{total} entries</p>

      {distinctActions.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
          <Link
            href={filterHref("")}
            className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              !actionFilter
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            All
          </Link>
          {distinctActions.map((a) => (
            <Link
              key={a}
              href={filterHref(a)}
              className={`shrink-0 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                actionFilter === a
                  ? "border-coral bg-s2 text-cream"
                  : "border-line bg-s1 text-muted hover:text-cream"
              }`}
            >
              {a}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing to audit yet"
          body="Every scan, approve, flag, and manual add shows up here as it happens."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const who = r.actor_user_id
              ? actorName.get(r.actor_user_id) ?? "User"
              : r.actor_allocation_id
              ? `${allocName.get(r.actor_allocation_id) ?? "Holder"} (holder)`
              : "—";
            const ctxPreview = truncateJson(r.context);
            return (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-cream font-semibold truncate">
                      {r.action}
                    </p>
                    <p className="label-mono mt-1 truncate">
                      {who} · {fmtTs(r.created_at)}
                    </p>
                    {r.entity_type && (
                      <p className="label-mono mt-1 truncate">
                        {r.entity_type}
                        {r.entity_id && `:${r.entity_id.slice(0, 8)}`}
                      </p>
                    )}
                  </div>
                </div>
                {ctxPreview && (
                  <pre className="label-mono mt-2 whitespace-pre-wrap break-words text-muted text-[10px]">
                    {ctxPreview}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-between mt-6">
          <Link
            aria-disabled={page <= 1}
            href={page > 1 ? pageHref(page - 1) : "#"}
            className={`label-mono ${
              page <= 1 ? "text-muted pointer-events-none" : "hover:text-cream"
            }`}
          >
            ← Prev
          </Link>
          <p className="label-mono">
            {page} / {pageCount}
          </p>
          <Link
            aria-disabled={page >= pageCount}
            href={page < pageCount ? pageHref(page + 1) : "#"}
            className={`label-mono ${
              page >= pageCount
                ? "text-muted pointer-events-none"
                : "hover:text-cream"
            }`}
          >
            Next →
          </Link>
        </nav>
      )}
    </main>
  );
}
