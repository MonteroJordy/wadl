import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

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

const STATUS_CHIP: Record<string, string> = {
  delivered: "chip chip--ok",
  sent: "chip chip--ok",
  failed: "chip chip--err",
  undelivered: "chip chip--err",
  opted_out: "chip chip--err",
  config_error: "chip chip--err",
  queued: "chip chip--ghost",
  sending: "chip chip--ghost",
  accepted: "chip chip--ghost",
};

function effectiveStatus(r: LogRow): string {
  return r.twilio_status ?? r.status;
}

const FILTERS = [
  ["", "All"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
  ["undelivered", "Undelivered"],
  ["sent", "Sent"],
  ["opted_out", "Opted out"],
  ["config_error", "Config error"],
] as const;

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
      "id, to_phone, body, template_key, provider, provider_sid, status, twilio_status, twilio_error_code, status_updated_at, error, segments, cost_estimate_usd, created_at, event:events(id, name), guest:guests(id, full_name)",
    )
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) {
    if (["delivered", "failed", "undelivered"].includes(status)) {
      query = query.or(`status.eq.${status},twilio_status.eq.${status}`);
    } else {
      query = query.eq("status", status);
    }
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as LogRow[];

  const deliveredCount = rows.filter(
    (r) => effectiveStatus(r) === "delivered",
  ).length;
  const failedCount = rows.filter((r) =>
    ["failed", "undelivered"].includes(effectiveStatus(r)),
  ).length;
  const totalCost = rows.reduce(
    (s, r) => s + (r.cost_estimate_usd ?? 0),
    0,
  );

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Outbound SMS"
        title="Message log"
        sub={`Last 200 sends · est $${totalCost.toFixed(2)}`}
        actions={
          <>
            <span className="chip chip--ok">{deliveredCount} delivered</span>
            {failedCount > 0 && (
              <span className="chip chip--err">{failedCount} failed</span>
            )}
          </>
        }
      />

      {/* Filter chips */}
      <div
        style={{
          padding: "var(--s-4) var(--s-8)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--s-1)",
        }}
      >
        {FILTERS.map(([s, label]) => {
          const active = status === s;
          return (
            <a
              key={s || "all"}
              href={s ? `/owner/sms-log?status=${s}` : "/owner/sms-log"}
              className={"nav-item" + (active ? " nav-item--active" : "")}
              style={{ fontSize: "var(--ts-sm)", textDecoration: "none" }}
            >
              {label}
            </a>
          );
        })}
      </div>

      <div style={{ padding: "var(--s-8)" }}>
        {rows.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-display-sm">Quiet line</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 480,
                marginInline: "auto",
              }}
            >
              Every text WADL fires — RSVP QRs, broadcasts, tier upgrades, staff
              invites — lands here. Quiet means nothing&apos;s going out.
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
              const effStatus = effectiveStatus(r);
              const chipClass = STATUS_CHIP[effStatus] ?? "chip chip--ghost";
              return (
                <li key={r.id}>
                  <div className="card" style={{ padding: "var(--s-4)" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "var(--s-3)",
                        marginBottom: "var(--s-2)",
                      }}
                    >
                      <div
                        className="t-body t-num"
                        style={{ fontFamily: "var(--mono)", fontWeight: 500 }}
                      >
                        {r.to_phone}
                      </div>
                      <span
                        className={chipClass}
                        title={
                          r.status_updated_at
                            ? `Updated ${new Date(r.status_updated_at).toLocaleString()}`
                            : undefined
                        }
                      >
                        {effStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p
                      className="t-body"
                      style={{ marginBottom: "var(--s-2)" }}
                    >
                      {r.body}
                    </p>
                    <div
                      className="t-meta"
                      style={{
                        display: "flex",
                        gap: "var(--s-2)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                      <span>· {r.provider}</span>
                      {r.template_key && <span>· {r.template_key}</span>}
                      <span>· {r.segments ?? 1} seg</span>
                      <span>· ${(r.cost_estimate_usd ?? 0).toFixed(4)}</span>
                    </div>
                    {r.event && (
                      <div
                        className="t-meta truncate"
                        style={{
                          marginTop: "var(--s-1)",
                          color: "var(--fg-2)",
                        }}
                      >
                        {r.event.name}
                        {r.guest ? ` · ${r.guest.full_name}` : ""}
                      </div>
                    )}
                    {r.error && (
                      <div
                        className="t-body-2"
                        style={{
                          marginTop: "var(--s-1)",
                          color: "var(--err)",
                        }}
                      >
                        {r.error}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
