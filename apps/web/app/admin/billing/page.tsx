import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AccountRow {
  id: string;
  display_name: string;
  account_type: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  created_at: string;
}

export default async function AdminBillingPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select(
      "id, display_name, account_type, stripe_customer_id, subscription_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AccountRow[];
  const paying = rows.filter((r) => !!r.stripe_customer_id);
  const active = rows.filter((r) => r.subscription_status === "active");
  const mrr = active.length * 199;
  const arr = mrr * 12;

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
            Billing
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            Revenue + plan state across all accounts.
          </p>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <KPI label="MRR" value={`$${mrr.toLocaleString()}`} accent />
          <KPI
            label="ARR RUN RATE"
            value={`$${arr.toLocaleString()}`}
            tone="ok"
          />
          <KPI label="ACTIVE PLANS" value={active.length} />
          <KPI label="WITH CUSTOMER" value={paying.length} />
        </section>

        <section>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            ACCOUNTS (MOST-RECENT 200)
          </div>
          <div
            className="w-card"
            style={{ padding: 20, overflowX: "auto" }}
          >
            <table
              style={{
                width: "100%",
                fontSize: 14,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  {[
                    "ACCOUNT",
                    "TYPE",
                    "STRIPE CUSTOMER",
                    "SUBSCRIPTION",
                    "CREATED",
                  ].map((h) => (
                    <th
                      key={h}
                      className="w-type-meta"
                      style={{ textAlign: "left", paddingBottom: 8 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderTop: "1px solid var(--w-line)" }}
                  >
                    <td
                      style={{
                        padding: "10px 0",
                        color: "var(--w-fg)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 280,
                      }}
                    >
                      {r.display_name}
                    </td>
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0" }}
                    >
                      {r.account_type.toUpperCase()}
                    </td>
                    <td
                      style={{
                        padding: "10px 0",
                        fontFamily: "var(--w-mono)",
                        fontSize: 12,
                      }}
                    >
                      {r.stripe_customer_id ? (
                        <span style={{ color: "var(--w-ok)" }}>
                          {r.stripe_customer_id.slice(0, 16)}…
                        </span>
                      ) : (
                        <span style={{ color: "var(--w-fg-muted)" }}>—</span>
                      )}
                    </td>
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0" }}
                    >
                      {r.subscription_status ? (
                        r.subscription_status.toUpperCase()
                      ) : (
                        <span style={{ color: "var(--w-fg-muted)" }}>—</span>
                      )}
                    </td>
                    <td
                      className="w-type-meta"
                      style={{ padding: "10px 0" }}
                    >
                      {new Date(r.created_at)
                        .toLocaleDateString()
                        .toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function KPI({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: string | number;
  tone?: "ok";
  accent?: boolean;
}) {
  const valueColor = tone === "ok" ? "var(--w-ok)" : "var(--w-fg)";
  return (
    <div
      className="w-card"
      style={{
        padding: 18,
        borderColor: accent ? "var(--w-acc)" : "var(--w-line)",
        background: accent ? "var(--w-acc-soft)" : "var(--w-surface-2)",
      }}
    >
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 8,
          color: accent ? "var(--w-acc-ink)" : valueColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}
