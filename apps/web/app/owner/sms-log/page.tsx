import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/wadl";

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

const STATUS_CHIP: Record<
  string,
  "ok" | "warn" | "err" | "ghost" | "neutral"
> = {
  delivered: "ok",
  sent: "ok",
  failed: "err",
  undelivered: "err",
  opted_out: "err",
  config_error: "err",
  queued: "ghost",
  sending: "ghost",
  accepted: "ghost",
};

function effectiveStatus(r: LogRow): string {
  return r.twilio_status ?? r.status;
}

const FILTERS = [
  ["", "all"],
  ["delivered", "delivered"],
  ["failed", "failed"],
  ["undelivered", "undelivered"],
  ["sent", "sent"],
  ["opted_out", "opted out"],
  ["config_error", "config error"],
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
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
            <div className="w-type-meta">OUTBOUND SMS</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              Message log
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              Last 200 sends · est ${totalCost.toFixed(2)}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <Chip tone="ok">{deliveredCount} DELIVERED</Chip>
            {failedCount > 0 && <Chip tone="err">{failedCount} FAILED</Chip>}
          </div>
        </div>

        {/* Filter chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 20,
          }}
        >
          {FILTERS.map(([s, label]) => {
            const active = status === s;
            return (
              <a
                key={s || "all"}
                href={s ? `/owner/sms-log?status=${s}` : "/owner/sms-log"}
                style={{ textDecoration: "none" }}
              >
                <Chip tone={active ? "neutral" : "ghost"}>
                  {label.toUpperCase()}
                </Chip>
              </a>
            );
          })}
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
            <div className="w-type-h1">Quiet line</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 480,
                marginInline: "auto",
              }}
            >
              Every text WADL fires — RSVP QRs, broadcasts, tier upgrades,
              staff invites — lands here. Quiet means nothing&apos;s going
              out.
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
              const effStatus = effectiveStatus(r);
              const tone = STATUS_CHIP[effStatus] ?? "ghost";
              return (
                <li key={r.id}>
                  <div
                    className="w-card"
                    style={{ padding: 14 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--w-mono)",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {r.to_phone}
                      </div>
                      <Chip
                        tone={tone}
                        title={
                          r.status_updated_at
                            ? `Updated ${new Date(r.status_updated_at).toLocaleString()}`
                            : undefined
                        }
                      >
                        {effStatus.replace(/_/g, " ").toUpperCase()}
                      </Chip>
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "var(--w-fg)",
                        marginBottom: 8,
                      }}
                    >
                      {r.body}
                    </p>
                    <div
                      className="w-type-meta"
                      style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                    >
                      <span>
                        {new Date(r.created_at).toLocaleString().toUpperCase()}
                      </span>
                      <span>· {r.provider.toUpperCase()}</span>
                      {r.template_key && (
                        <span>· {r.template_key.toUpperCase()}</span>
                      )}
                      <span>· {r.segments ?? 1} SEG</span>
                      <span>
                        · ${(r.cost_estimate_usd ?? 0).toFixed(4)}
                      </span>
                    </div>
                    {r.event && (
                      <div
                        className="w-type-meta"
                        style={{
                          marginTop: 6,
                          color: "var(--w-fg)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.event.name.toUpperCase()}
                        {r.guest ? ` · ${r.guest.full_name.toUpperCase()}` : ""}
                      </div>
                    )}
                    {r.error && (
                      <div
                        className="w-type-body-sm"
                        style={{
                          marginTop: 6,
                          color: "var(--w-err)",
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
