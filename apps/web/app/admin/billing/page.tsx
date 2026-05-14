import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Stat } from "@/components/v5";

export const dynamic = "force-dynamic";

const COLS = "1.6fr 110px 1.4fr 130px 120px";

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
    <main id="main-content">
      <PageHeader
        eyebrow="Platform"
        title="Billing"
        sub="Revenue + plan state across all accounts."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Stat label="MRR" value={`$${mrr.toLocaleString()}`} />
        <Stat label="ARR run rate" value={`$${arr.toLocaleString()}`} />
        <Stat label="Active plans" value={active.length} />
        <Stat label="With customer" value={paying.length} last />
      </div>

      <div style={{ padding: "var(--s-8)" }}>
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          Accounts · most-recent 200
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <div
            className="row"
            style={{
              gridTemplateColumns: COLS,
              padding: "var(--s-3) var(--s-5)",
              background: "var(--bg)",
            }}
          >
            {["Account", "Type", "Stripe customer", "Subscription", "Created"].map(
              (h) => (
                <span key={h} className="t-meta">
                  {h}
                </span>
              ),
            )}
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              className="row"
              style={{
                gridTemplateColumns: COLS,
                padding: "var(--s-4) var(--s-5)",
              }}
            >
              <span className="t-body truncate" style={{ color: "var(--fg)" }}>
                {r.display_name}
              </span>
              <span className="chip">{r.account_type}</span>
              <span
                className="t-body-2 truncate"
                style={{ fontFamily: "var(--mono)", fontSize: "var(--ts-sm)" }}
              >
                {r.stripe_customer_id ? (
                  <span style={{ color: "var(--ok)" }}>
                    {r.stripe_customer_id.slice(0, 16)}…
                  </span>
                ) : (
                  "—"
                )}
              </span>
              <span>
                {r.subscription_status ? (
                  <span className="chip chip--ok">
                    {r.subscription_status}
                  </span>
                ) : (
                  <span className="t-body-2">—</span>
                )}
              </span>
              <span className="t-meta">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
