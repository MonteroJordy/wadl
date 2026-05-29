import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";
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

const PRIORITY_CHIP: Record<string, string> = {
  urgent: "chip chip--err",
  high: "chip chip--warn",
  normal: "chip",
  low: "chip chip--ghost",
};

const STATUS_CHIP: Record<string, string> = {
  open: "chip chip--err",
  pending: "chip chip--warn",
  resolved: "chip chip--ok",
  closed: "chip chip--ghost",
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
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Support"
        sub="Filter by status. Tickets default to open."
      />
      <div
        style={{
          padding: "var(--s-4) var(--s-8)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: "var(--s-1)",
          flexWrap: "wrap",
        }}
      >
        {(["open", "pending", "resolved", "closed", "all"] as const).map(
          (s) => {
            const active = status === s;
            return (
              <Link
                key={s}
                href={
                  s === "open" ? "/admin/support" : `/admin/support?status=${s}`
                }
                style={{ textDecoration: "none" }}
              >
                <span
                  className={"nav-item" + (active ? " nav-item--active" : "")}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </span>
              </Link>
            );
          },
        )}
      </div>

      <div style={{ padding: "var(--s-8)" }}>
        {rows.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-16) var(--s-8)",
              textAlign: "center",
            }}
          >
            <div className="t-h1">No tickets</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
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
              gap: "var(--s-2)",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {rows.map((r) => (
              <li
                key={r.id}
                className="card"
                style={{ padding: "var(--s-4)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "var(--s-3)",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      className="t-h2 truncate"
                      style={{ color: "var(--fg)" }}
                    >
                      {r.subject}
                    </p>
                    <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                      {(r.account?.display_name ?? "No-account").toUpperCase()}{" "}
                      ·{" "}
                      {(
                        r.reporter?.full_name ?? r.reporter?.email ?? "—"
                      ).toUpperCase()}{" "}
                      · {new Date(r.created_at).toLocaleString().toUpperCase()}
                    </div>
                    <p
                      className="t-body-2"
                      style={{
                        marginTop: "var(--s-2)",
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
                      gap: "var(--s-2)",
                      flexShrink: 0,
                    }}
                  >
                    <span className={PRIORITY_CHIP[r.priority] ?? "chip"}>
                      {r.priority}
                    </span>
                    <span className={STATUS_CHIP[r.status] ?? "chip"}>
                      {r.status}
                    </span>
                    <StatusButton ticketId={r.id} currentStatus={r.status} />
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
