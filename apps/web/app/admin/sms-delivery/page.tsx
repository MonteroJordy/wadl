import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "SMS delivery — WADL" };

const PLATFORM_OWNER_EMAIL = "jmontero@mainframeagency.com";

interface Row {
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
  account: { display_name: string | null } | null;
  event: { name: string | null } | null;
  guest: { full_name: string | null } | null;
}

const STATUS_COLOR: Record<string, string> = {
  delivered: "var(--w-ok)",
  sent: "var(--w-ok)",
  queued: "var(--w-fg-muted)",
  sending: "var(--w-fg-muted)",
  accepted: "var(--w-fg-muted)",
  failed: "var(--w-err)",
  undelivered: "var(--w-err)",
  opted_out: "var(--w-err)",
  config_error: "var(--w-err)",
};

function effective(r: Row): string {
  return r.twilio_status ?? r.status;
}

export default async function AdminSmsDeliveryPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const { profile } = await requireOwnerContext();
  if (profile.email !== PLATFORM_OWNER_EMAIL) redirect("/owner");

  const status = (searchParams.status ?? "").trim();
  const q = (searchParams.q ?? "").trim();
  const admin = createAdminClient();

  let query = admin
    .from("sms_log")
    .select(
      "id, to_phone, body, template_key, provider, provider_sid, status, twilio_status, twilio_error_code, status_updated_at, error, segments, cost_estimate_usd, created_at, account:accounts(display_name), event:events(name), guest:guests(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    if (["delivered", "failed", "undelivered"].includes(status)) {
      query = query.or(`status.eq.${status},twilio_status.eq.${status}`);
    } else {
      query = query.eq("status", status);
    }
  }
  if (q) query = query.ilike("to_phone", `%${q}%`);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const totals = {
    all: rows.length,
    delivered: rows.filter((r) => effective(r) === "delivered").length,
    failed: rows.filter((r) =>
      ["failed", "undelivered"].includes(effective(r)),
    ).length,
    cost: rows.reduce((s, r) => s + (r.cost_estimate_usd ?? 0), 0),
  };

  return (
    <main id="main-content" style={{ padding: "32px 24px 96px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link
          href="/admin"
          className="w-type-meta"
          style={{
            color: "var(--w-fg-muted)",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 12,
          }}
        >
          ← ADMIN
        </Link>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">PLATFORM</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            SMS delivery
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Last 200 outbound messages across the platform · {totals.delivered}{" "}
            delivered · {totals.failed} failed · $
            {totals.cost.toFixed(2)} estimated cost
          </p>
        </div>

        <form
          action="/admin/sms-delivery"
          method="get"
          style={{ marginBottom: 12 }}
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Filter by phone…"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--w-surface-1)",
              border: "1px solid var(--w-line)",
              color: "var(--w-fg)",
              padding: "10px 12px",
              fontFamily: "var(--w-sans)",
              fontSize: 14,
            }}
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 24,
          }}
        >
          {[
            "",
            "delivered",
            "sent",
            "queued",
            "failed",
            "undelivered",
            "opted_out",
          ].map((s) => {
            const active = status === s;
            const sp = new URLSearchParams();
            if (s) sp.set("status", s);
            if (q) sp.set("q", q);
            const href = `/admin/sms-delivery${sp.toString() ? `?${sp}` : ""}`;
            return (
              <Link
                key={s || "all"}
                href={href}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <span className={active ? "chip" : "chip chip--ghost"}>
                  {(s.replace("_", " ") || "ALL").toUpperCase()}
                </span>
              </Link>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No outbound SMS</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 540,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              When OTPs, RSVP confirmations, broadcasts, escalations, and tier
              upgrades go out, every send lands here with delivery status.
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
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--w-mono)",
                      color: "var(--w-fg)",
                    }}
                  >
                    {r.to_phone}
                  </p>
                  <div
                    className="w-type-meta"
                    style={{
                      color: STATUS_COLOR[effective(r)] ?? "var(--w-fg-muted)",
                    }}
                    title={
                      r.status_updated_at
                        ? `Updated ${new Date(r.status_updated_at).toLocaleString()}`
                        : undefined
                    }
                  >
                    {effective(r).replace("_", " ").toUpperCase()}
                    {r.twilio_error_code && ` · ${r.twilio_error_code}`}
                  </div>
                </div>
                <p
                  style={{
                    color: "var(--w-fg)",
                    opacity: 0.85,
                    fontSize: 14,
                    lineHeight: 1.5,
                    marginBottom: 8,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.body}
                </p>
                <div className="w-type-meta">
                  {new Date(r.created_at).toLocaleString().toUpperCase()} ·{" "}
                  {r.provider.toUpperCase()}
                  {r.template_key ? ` · ${r.template_key.toUpperCase()}` : ""}{" "}
                  · {r.segments ?? 1} SEG · $
                  {(r.cost_estimate_usd ?? 0).toFixed(4)}
                </div>
                <div
                  className="w-type-meta"
                  style={{
                    marginTop: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {(r.account?.display_name ?? "—").toUpperCase()}
                  {r.event?.name && (
                    <>
                      {" · "}
                      <span style={{ color: "var(--w-fg)" }}>
                        {r.event.name}
                      </span>
                    </>
                  )}
                  {r.guest?.full_name && (
                    <>
                      {" · "}
                      <span style={{ color: "var(--w-fg)" }}>
                        {r.guest.full_name}
                      </span>
                    </>
                  )}
                  {r.provider_sid && <> · {r.provider_sid}</>}
                </div>
                {r.error && (
                  <div
                    className="w-type-meta"
                    style={{ marginTop: 4, color: "var(--w-err)" }}
                  >
                    {r.error}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
