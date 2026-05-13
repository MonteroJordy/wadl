import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/wadl";
import StatusButton from "./status-button";

export const dynamic = "force-dynamic";

interface TicketRow {
  id: string;
  subject: string;
  body: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  account: { display_name: string } | null;
  reporter: { full_name: string | null; email: string | null } | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--w-err)",
  high: "var(--w-warn)",
  normal: "var(--w-fg)",
  low: "var(--w-fg-muted)",
};

const STATUS_COLOR: Record<string, string> = {
  open: "var(--w-err)",
  pending: "var(--w-warn)",
  resolved: "var(--w-ok)",
  closed: "var(--w-fg-muted)",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status ?? "open";
  const admin = createAdminClient();

  let query = admin
    .from("support_tickets")
    .select(
      "id, subject, body, priority, status, created_at, resolved_at, " +
        "account:accounts(display_name), reporter:profiles!reporter_user_id(full_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as unknown as TicketRow[];

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
            Support
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Filter by status. Tickets default to open.
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["open", "pending", "resolved", "closed", "all"] as const).map(
            (s) => {
              const active = status === s;
              return (
                <a
                  key={s}
                  href={
                    s === "open" ? "/admin/support" : `/admin/support?status=${s}`
                  }
                  style={{ textDecoration: "none" }}
                >
                  <Chip tone={active ? "acc" : "ghost"}>{s.toUpperCase()}</Chip>
                </a>
              );
            },
          )}
        </div>

        {rows.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No tickets</div>
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
              {status === "all"
                ? "No tickets in the system yet."
                : `No tickets in '${status}' state. Try another filter.`}
            </p>
          </div>
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {rows.map((r) => (
              <li key={r.id} className="w-card" style={{ padding: 16 }}>
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
                      }}
                    >
                      {r.subject}
                    </p>
                    <div className="w-type-meta" style={{ marginTop: 4 }}>
                      {(r.account?.display_name ?? "NO-ACCOUNT").toUpperCase()}{" "}
                      ·{" "}
                      {(
                        r.reporter?.full_name ?? r.reporter?.email ?? "—"
                      ).toUpperCase()}{" "}
                      · {new Date(r.created_at).toLocaleString().toUpperCase()}
                    </div>
                    <p
                      style={{
                        color: "var(--w-fg)",
                        opacity: 0.7,
                        fontSize: 14,
                        marginTop: 8,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {r.body}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      className="w-type-meta"
                      style={{
                        color: PRIORITY_COLOR[r.priority] ?? "var(--w-fg)",
                      }}
                    >
                      {r.priority.toUpperCase()}
                    </div>
                    <div
                      className="w-type-meta"
                      style={{
                        color: STATUS_COLOR[r.status] ?? "var(--w-fg)",
                      }}
                    >
                      {r.status.toUpperCase()}
                    </div>
                    <StatusButton
                      ticketId={r.id}
                      currentStatus={r.status}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
