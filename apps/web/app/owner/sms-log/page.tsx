import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "SMS log — WADL" };

interface LogRow {
  id: string;
  to_phone: string;
  body: string;
  template_key: string | null;
  provider: string;
  provider_sid: string | null;
  status: string;
  error: string | null;
  segments: number | null;
  cost_estimate_usd: number | null;
  created_at: string;
  event: { id: string; name: string } | null;
  guest: { id: string; full_name: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  sent: "text-mint",
  opted_out: "text-coral",
};

export default async function SmsLogPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { account } = await requireOwnerContext();
  const status = searchParams.status ?? "";
  const admin = createAdminClient();

  let query = admin
    .from("sms_log")
    .select(
      "id, to_phone, body, template_key, provider, provider_sid, status, error, segments, cost_estimate_usd, created_at, event:events(id, name), guest:guests(id, full_name)"
    )
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as unknown as LogRow[];

  const sentCount = rows.filter((r) => r.status === "sent").length;
  const totalCost = rows.reduce(
    (s, r) => s + (r.cost_estimate_usd ?? 0),
    0
  );

  return (
    <main
      id="main-content"
      className="mx-auto max-w-frame md:max-w-4xl px-6 pt-12 pb-8 md:py-12"
    >
      <header className="mb-6">
        <p className="label-mono mb-1">Outbound SMS</p>
        <h1 className="display-lg">Message log</h1>
        <p className="label-mono mt-2">
          Last 200 sends · {sentCount} delivered · est ${totalCost.toFixed(2)}
        </p>
      </header>

      <div className="flex gap-1 mb-4">
        {["", "sent", "opted_out", "config_error"].map((s) => (
          <a
            key={s || "all"}
            href={s ? `/owner/sms-log?status=${s}` : "/owner/sms-log"}
            className={`px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              status === s
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            {s.replace("_", " ") || "all"}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No SMS yet"
          body="Sends from RSVP confirmations, broadcasts, tier upgrades, and staff invites will land here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <p className="font-mono text-sm text-cream">{r.to_phone}</p>
                <span className={`label-mono ${STATUS_TONE[r.status] ?? "text-muted"}`}>
                  {r.status}
                </span>
              </div>
              <p className="text-cream/80 text-sm leading-relaxed mb-2">
                {r.body}
              </p>
              <p className="label-mono">
                {new Date(r.created_at).toLocaleString()} ·{" "}
                {r.provider}
                {r.template_key ? ` · ${r.template_key}` : ""} ·{" "}
                {r.segments ?? 1} seg ·{" "}
                ${(r.cost_estimate_usd ?? 0).toFixed(4)}
              </p>
              {r.event && (
                <p className="label-mono mt-1 text-cream truncate">
                  {r.event.name}
                  {r.guest ? ` · ${r.guest.full_name}` : ""}
                </p>
              )}
              {r.error && (
                <p className="label-mono mt-1 text-coral">{r.error}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
