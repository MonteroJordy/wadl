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
      "id, display_name, account_type, stripe_customer_id, subscription_status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AccountRow[];
  const paying = rows.filter((r) => !!r.stripe_customer_id);
  const active = rows.filter((r) => r.subscription_status === "active");
  // Conservative MRR estimate: $199/mo Pro × active.
  const mrr = active.length * 199;
  const arr = mrr * 12;

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 pt-6 pb-12">
      <h1 className="display-lg mb-2">Billing</h1>
      <p className="label-mono mb-6">Revenue + plan state across all accounts.</p>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card">
          <p className="label-mono">MRR</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            ${mrr.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">ARR run rate</p>
          <p className="font-display text-3xl text-mint leading-none mt-1">
            ${arr.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">Active plans</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {active.length}
          </p>
        </div>
        <div className="card">
          <p className="label-mono">With customer</p>
          <p className="font-display text-3xl text-cream leading-none mt-1">
            {paying.length}
          </p>
        </div>
      </section>

      <section>
        <p className="label-mono mb-2">Accounts (most-recent 200)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="label-mono text-left">
              <tr>
                <th className="pb-2">Account</th>
                <th>Type</th>
                <th>Stripe customer</th>
                <th>Subscription</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-2 text-cream truncate max-w-xs">
                    {r.display_name}
                  </td>
                  <td className="py-2 label-mono">{r.account_type}</td>
                  <td className="py-2 font-mono text-xs">
                    {r.stripe_customer_id ? (
                      <span className="text-mint">
                        {r.stripe_customer_id.slice(0, 16)}…
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 label-mono">
                    {r.subscription_status ?? (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 label-mono">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
