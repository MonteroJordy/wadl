import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/wadl";

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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← {event.name.toUpperCase()}
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">AUDIT LOG</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Audit trail
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Every add, approve, reject, override, scan, opt-out — attributed
            and timestamped.
          </p>
          <p
            className="w-type-meta"
            style={{ marginTop: 12, color: "var(--w-fg-dim)" }}
          >
            {total} ENTRIES
          </p>
        </div>

        {distinctActions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 6,
              marginBottom: 16,
            }}
          >
            <Link
              href={filterHref("")}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <Chip tone={!actionFilter ? "acc" : "ghost"}>ALL</Chip>
            </Link>
            {distinctActions.map((a) => (
              <Link
                key={a}
                href={filterHref(a)}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <Chip tone={actionFilter === a ? "acc" : "ghost"}>
                  {a.toUpperCase()}
                </Chip>
              </Link>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">Nothing to audit yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 460,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Every scan, approve, flag, and manual add shows up here as it
              happens.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
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
                  className="w-card"
                  style={{ padding: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          color: "var(--w-fg)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontFamily: "var(--w-mono)",
                          fontSize: 13,
                        }}
                      >
                        {r.action}
                      </p>
                      <div
                        className="w-type-meta"
                        style={{
                          marginTop: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {who.toUpperCase()} · {fmtTs(r.created_at).toUpperCase()}
                      </div>
                      {r.entity_type && (
                        <div
                          className="w-type-meta"
                          style={{
                            marginTop: 4,
                            color: "var(--w-fg-dim)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.entity_type.toUpperCase()}
                          {r.entity_id && `:${r.entity_id.slice(0, 8)}`}
                        </div>
                      )}
                    </div>
                  </div>
                  {ctxPreview && (
                    <pre
                      style={{
                        marginTop: 8,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "var(--w-fg-muted)",
                        fontFamily: "var(--w-mono)",
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
              marginTop: 24,
            }}
          >
            <Link
              aria-disabled={page <= 1}
              href={page > 1 ? pageHref(page - 1) : "#"}
              className="w-type-meta"
              style={{
                color: page <= 1 ? "var(--w-fg-dim)" : "var(--w-fg)",
                textDecoration: "none",
                pointerEvents: page <= 1 ? "none" : undefined,
              }}
            >
              ← PREV
            </Link>
            <div className="w-type-meta">
              {page} / {pageCount}
            </div>
            <Link
              aria-disabled={page >= pageCount}
              href={page < pageCount ? pageHref(page + 1) : "#"}
              className="w-type-meta"
              style={{
                color:
                  page >= pageCount ? "var(--w-fg-dim)" : "var(--w-fg)",
                textDecoration: "none",
                pointerEvents: page >= pageCount ? "none" : undefined,
              }}
            >
              NEXT →
            </Link>
          </nav>
        )}
      </div>
    </main>
  );
}
