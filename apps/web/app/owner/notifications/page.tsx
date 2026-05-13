import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import {
  KIND_LABEL,
  KIND_TONE,
  type NotificationKind,
} from "@/lib/notifications";
import { markAllReadAction } from "./actions";
import { Button, Chip } from "@/components/wadl";
import FormSubmit from "@/components/form-submit";
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
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="w-type-meta">INBOX</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              Notifications
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              {rows.length} total
              {unread > 0 ? ` · ${unread} unread` : " · all read"}
            </p>
          </div>
          {unread > 0 && (
            <form action={markAllReadAction}>
              <FormSubmit variant="ghost" pendingLabel="Marking…">
                Mark all read
              </FormSubmit>
            </form>
          )}
        </div>

        {rows.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            <div className="w-type-h1">Inbox zero</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
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
              margin: "20px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {rows.map((r) => {
              const kind = r.kind as NotificationKind;
              const label = KIND_LABEL[kind] ?? r.kind;
              const tone = KIND_TONE[kind] ?? "coral";
              const chipTone =
                tone === "mint"
                  ? "ok"
                  : tone === "gold"
                    ? "warn"
                    : "acc";
              const message =
                (r.payload?.message as string | undefined) ?? label;
              const href = (r.payload?.href as string | undefined) ?? null;
              const isUnread = !r.read_at;
              const inner = (
                <div
                  className="w-card"
                  style={{
                    padding: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    borderColor: isUnread
                      ? "var(--w-acc)"
                      : "var(--w-line)",
                    background: isUnread
                      ? "var(--w-acc-soft)"
                      : "var(--w-surface-2)",
                  }}
                >
                  <Chip tone={chipTone}>{label}</Chip>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {message}
                    </p>
                    <p
                      className="w-type-meta"
                      style={{ marginTop: 4 }}
                    >
                      {ago(r.created_at).toUpperCase()}
                    </p>
                  </div>
                  {isUnread && (
                    <span
                      style={{
                        flexShrink: 0,
                        width: 8,
                        height: 8,
                        background: "var(--w-acc)",
                        marginTop: 4,
                      }}
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
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                      }}
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
