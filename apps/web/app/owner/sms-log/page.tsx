import { requireOwnerContext } from "@/lib/owner";
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
  twilio_status: string | null;
  twilio_error_code: string | null;
  status_updated_at: string | null;
  error: string | null;
  segments: number | null;
  cost_estimate_usd: number | null;
  created_at: string;
  event: { id: string; name: string } | null;
  guest: { id: string; full_name: string } | null;
}

// Tones map to actual delivery outcomes. "delivered" / "sent" are mint
// (positive), terminal failure modes are coral, in-flight or unknown
// statuses are muted.
const STATUS_TONE: Record<string, string> = {
  delivered: "text-mint",
  sent: "text-mint",
  failed: "text-coral",
  undelivered: "text-coral",
  opted_out: "text-coral",
  config_error: "text-coral",
  queued: "text-muted",
  sending: "text-muted",
  accepted: "text-muted",
};

// Display label preferring the latest Twilio status when present.
function effectiveStatus(r: LogRow): string {
  return r.twilio_status ?? r.status;
}

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
      "id, to_phone, body, template_key, provider, provider_sid, status, twilio_status, twilio_error_code, status_updated_at, error, segments, cost_estimate_usd, created_at, event:events(id, name), guest:guests(id, full_name)"
    )
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(200);
  // Twilio-callback statuses (delivered/failed/undelivered) live primarily
  // on twilio_status; row.status overwrites only on terminal callbacks. Fall
  // back to either-column match so old rows still surface in filters.
  if (status) {
    if (["delivered", "failed", "undelivered"].includes(status)) {
      query = query.or(`status.eq.${status},twilio_status.eq.${status}`);
    } else {
      query = query.eq("status", status);
    }
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as LogRow[];

  const deliveredCount = rows.filter((r) => effectiveStatus(r) === "delivered").length;
  const failedCount = rows.filter((r) =>
    ["failed", "undelivered"].includes(effectiveStatus(r))
  ).length;
  const totalCost = rows.reduce((s, r) => s + (r.cost_estimate_usd ?? 0), 0);

  return (
    <main
      id="main-content"
      className="mx-auto max-w-frame md:max-w-4xl px-6 pt-12 pb-8 md:py-12"
    >
      <header className="mb-6">
        <p className="label-mono mb-1">Outbound SMS</p>
        <h1 className="display-lg">Message log</h1>
        <p className="label-mono mt-2">
          Last 200 sends · {deliveredCount} delivered
          {failedCount > 0 && <> · {failedCount} failed</>} · est $
          {totalCost.toFixed(2)}
        </p>
      </header>

      <div className="flex flex-wrap gap-1 mb-4">
        {["", "delivered", "failed", "undelivered", "sent", "opted_out", "config_error"].map((s) => (
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
          title="Quiet line"
          body="Every text WADL fires — RSVP QRs, broadcasts, tier upgrades, staff invites — lands here. Quiet means nothing's going out."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <p className="font-mono text-sm text-cream">{r.to_phone}</p>
                <span
                  className={`label-mono ${
                    STATUS_TONE[effectiveStatus(r)] ?? "text-muted"
                  }`}
                  title={
                    r.status_updated_at
                      ? `Updated ${new Date(r.status_updated_at).toLocaleString()}`
                      : undefined
                  }
                >
                  {effectiveStatus(r).replace("_", " ")}
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
