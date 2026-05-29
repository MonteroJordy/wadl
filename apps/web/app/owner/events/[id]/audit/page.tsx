import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";

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

  // Distinct actions, count, and page rows are independent — fire all three
  // in parallel. Previously this was three sequential round-trips on every
  // audit page render.
  const distinctQuery = admin
    .from("audit_log")
    .select("action")
    .eq("event_id", event.id)
    .order("action")
    .limit(500);

  const countQuery = admin
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  const pageQuery = admin
    .from("audit_log")
    .select(
      "id, created_at, actor_user_id, actor_allocation_id, action, entity_type, entity_id, context",
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const [distinctRes, countRes, pageRes] = await Promise.all([
    distinctQuery,
    actionFilter ? countQuery.eq("action", actionFilter) : countQuery,
    actionFilter ? pageQuery.eq("action", actionFilter) : pageQuery,
  ]);

  const distinctActions = [
    ...new Set(
      ((distinctRes.data ?? []) as Array<{ action: string }>).map(
        (r) => r.action,
      ),
    ),
  ];
  const totalCount = countRes.count;
  const rows = (pageRes.data ?? []) as AuditRow[];

  const actorIds = [
    ...new Set(rows.map((r) => r.actor_user_id).filter(Boolean) as string[]),
  ];
  const allocIds = [
    ...new Set(
      rows.map((r) => r.actor_allocation_id).filter(Boolean) as string[],
    ),
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
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Audit",
        ]}
      />
      <PageHeader
        eyebrow={`Audit log · ${total} entries`}
        title="Audit trail"
        sub="Every add, approve, reject, override, scan, opt-out — attributed and timestamped."
      />
      <EventSubNav active="overview" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {distinctActions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "var(--s-1)",
              overflowX: "auto",
              paddingBottom: "var(--s-2)",
              marginBottom: "var(--s-4)",
            }}
          >
            <Link
              href={filterHref("")}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <span
                className={`chip ${!actionFilter ? "chip--solid" : "chip--ghost"}`}
              >
                All
              </span>
            </Link>
            {distinctActions.map((a) => (
              <Link
                key={a}
                href={filterHref(a)}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <span
                  className={`chip ${
                    actionFilter === a ? "chip--solid" : "chip--ghost"
                  }`}
                >
                  {a}
                </span>
              </Link>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-h1">Nothing to audit yet</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              Every scan, approve, flag, and manual add shows up here as it
              happens.
            </div>
          </div>
        ) : (
          <div className="card">
            {rows.map((r) => {
              const who = r.actor_user_id
                ? (actorName.get(r.actor_user_id) ?? "User")
                : r.actor_allocation_id
                  ? `${allocName.get(r.actor_allocation_id) ?? "Holder"} (holder)`
                  : "—";
              const ctxPreview = truncateJson(r.context);
              return (
                <div
                  key={r.id}
                  style={{
                    padding: "var(--s-4)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "var(--s-3)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="t-num"
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "var(--ts-sm)",
                        color: "var(--fg)",
                      }}
                    >
                      {r.action}
                    </span>
                    <span className="t-meta">
                      {who} · {fmtTs(r.created_at)}
                    </span>
                  </div>
                  {r.entity_type && (
                    <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                      {r.entity_type}
                      {r.entity_id && `:${r.entity_id.slice(0, 8)}`}
                    </div>
                  )}
                  {ctxPreview && (
                    <pre
                      style={{
                        marginTop: "var(--s-2)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "var(--fg-3)",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      {ctxPreview}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pageCount > 1 && (
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "var(--s-6)",
            }}
          >
            <Link
              aria-disabled={page <= 1}
              href={page > 1 ? pageHref(page - 1) : "#"}
              className="t-meta"
              style={{
                color: page <= 1 ? "var(--fg-4)" : "var(--fg)",
                textDecoration: "none",
                pointerEvents: page <= 1 ? "none" : undefined,
              }}
            >
              ← Prev
            </Link>
            <div className="t-meta">
              {page} / {pageCount}
            </div>
            <Link
              aria-disabled={page >= pageCount}
              href={page < pageCount ? pageHref(page + 1) : "#"}
              className="t-meta"
              style={{
                color: page >= pageCount ? "var(--fg-4)" : "var(--fg)",
                textDecoration: "none",
                pointerEvents: page >= pageCount ? "none" : undefined,
              }}
            >
              Next →
            </Link>
          </nav>
        )}
      </div>
    </main>
  );
}
