import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";
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

const PRIORITY_TONE: Record<string, string> = {
  urgent: "text-coral",
  high: "text-gold",
  normal: "text-cream",
  low: "text-muted",
};

const STATUS_TONE: Record<string, string> = {
  open: "text-coral",
  pending: "text-gold",
  resolved: "text-mint",
  closed: "text-muted",
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
        "account:accounts(display_name), reporter:profiles!reporter_user_id(full_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as unknown as TicketRow[];

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Support</h1>
      <p className="label-mono mb-6">Filter by status. Tickets default to open.</p>

      <div className="flex gap-1 mb-4">
        {(["open", "pending", "resolved", "closed", "all"] as const).map((s) => (
          <a
            key={s}
            href={s === "open" ? "/admin/support" : `/admin/support?status=${s}`}
            className={`px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              status === s
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No tickets"
          body={
            status === "all"
              ? "No tickets in the system yet."
              : `No tickets in '${status}' state. Try another filter.`
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-cream font-semibold truncate">
                    {r.subject}
                  </p>
                  <p className="label-mono mt-1">
                    {r.account?.display_name ?? "no-account"} ·{" "}
                    {r.reporter?.full_name ?? r.reporter?.email ?? "—"} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-cream/70 text-sm mt-2 line-clamp-3">
                    {r.body}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  <p
                    className={`label-mono ${PRIORITY_TONE[r.priority] ?? ""}`}
                  >
                    {r.priority}
                  </p>
                  <p
                    className={`label-mono ${STATUS_TONE[r.status] ?? ""}`}
                  >
                    {r.status}
                  </p>
                  <StatusButton ticketId={r.id} currentStatus={r.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
