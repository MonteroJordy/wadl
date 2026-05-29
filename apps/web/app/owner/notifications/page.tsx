import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import {
  KIND_LABEL,
  KIND_TONE,
  type NotificationKind,
} from "@/lib/notifications";
import { markAllReadAction } from "./actions";
import { PageHeader } from "@/components/v5";
import { InlineFormSubmit } from "@/components/form-submit";
import { fmtRelative } from "@wadl/shared/format";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// Local alias for the shared formatter — kept so existing `ago(...)`
// call sites in this file continue to read naturally.
const ago = (iso: string) => fmtRelative(iso) ?? "—";

export default async function NotificationsPage() {
  const { supabase, account } = await requireOwnerContext();

  const { data } = await supabase
    .from("notifications")
    .select("id, kind, payload, read_at, created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Row[];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        sub={`${rows.length} total${
          unread > 0 ? ` · ${unread} unread` : " · all read"
        }`}
        actions={
          unread > 0 ? (
            <form action={markAllReadAction}>
              <InlineFormSubmit className="btn btn--ghost" pendingLabel="Marking…">
                Mark all read
              </InlineFormSubmit>
            </form>
          ) : undefined
        }
      />

      <div style={{ padding: "var(--s-8)", maxWidth: 800 }}>
        {rows.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-display-sm">Inbox zero</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              RSVPs, capacity alerts, staff joins, escalations — they all land
              here when the night gets loud.
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {rows.map((r) => {
              const kind = r.kind as NotificationKind;
              const label = KIND_LABEL[kind] ?? r.kind;
              const tone = KIND_TONE[kind] ?? "coral";
              const chipClass =
                tone === "mint"
                  ? "chip chip--ok"
                  : tone === "gold"
                    ? "chip chip--warn"
                    : "chip chip--info";
              const message =
                (r.payload?.message as string | undefined) ?? label;
              const href = (r.payload?.href as string | undefined) ?? null;
              const isUnread = !r.read_at;
              const inner = (
                <div
                  className="card"
                  style={{
                    padding: "var(--s-4)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--s-3)",
                    borderColor: isUnread ? "var(--line-2)" : "var(--line)",
                  }}
                >
                  <span className={chipClass}>{label}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      className="t-body"
                      style={{ fontWeight: isUnread ? 500 : 400 }}
                    >
                      {message}
                    </p>
                    <p
                      className="t-meta"
                      style={{ marginTop: "var(--s-1)" }}
                    >
                      {ago(r.created_at)}
                    </p>
                  </div>
                  {isUnread && (
                    <span
                      className="dot dot--ok"
                      style={{ flexShrink: 0, marginTop: 6 }}
                      aria-label="unread"
                    />
                  )}
                </div>
              );
              return (
                <li key={r.id}>
                  {href ? (
                    <Link
                      href={href}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
