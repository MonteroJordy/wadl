import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import CreateWebhookForm from "./create-form";
import {
  retryDeliveriesAction,
  toggleWebhookAction,
  deleteWebhookAction,
} from "./actions";

export const dynamic = "force-dynamic";

interface Endpoint {
  id: string;
  url: string;
  events: string;
  active: boolean;
  created_at: string;
  secret: string;
}

interface Delivery {
  id: string;
  endpoint_id: string;
  event_name: string;
  status_code: number | null;
  attempt: number;
  delivered_at: string | null;
  last_error: string | null;
  created_at: string;
}

export default async function WebhooksPage() {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();

  const [endpointsRes, deliveriesRes] = await Promise.all([
    admin
      .from("webhook_endpoints")
      .select("id, url, events, active, secret, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false }),
    admin
      .from("webhook_deliveries")
      .select(
        "id, endpoint_id, event_name, status_code, attempt, delivered_at, last_error, created_at, endpoint:webhook_endpoints!inner(account_id)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const endpoints = (endpointsRes.data ?? []) as Endpoint[];
  const deliveries = (
    (deliveriesRes.data ?? []) as unknown as Array<
      Delivery & { endpoint: { account_id: string } }
    >
  ).filter((d) => d.endpoint.account_id === account.id);

  return (
    <main className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <h1 className="display-lg mb-2">Webhooks</h1>
      <p className="label-mono mb-6">
        POSTs to your URL when events fire. HMAC-SHA256 signed. Backoff on failure.
      </p>

      <CreateWebhookForm />

      <section className="mt-6">
        <p className="label-mono mb-3">Endpoints</p>
        {endpoints.length === 0 ? (
          <p className="text-muted text-sm">No endpoints yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {endpoints.map((e) => (
              <li key={e.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-cream truncate">{e.url}</p>
                    <p className="label-mono mt-1">
                      events: <span className="text-cream">{e.events}</span> ·{" "}
                      {e.active ? (
                        <span className="text-mint">active</span>
                      ) : (
                        <span className="text-muted">paused</span>
                      )}
                    </p>
                    <p className="label-mono mt-1 break-all">
                      secret: <span className="text-cream">{e.secret}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <form action={toggleWebhookAction.bind(null, e.id, !e.active)}>
                      <button
                        type="submit"
                        className="label-mono hover:text-cream"
                      >
                        {e.active ? "Pause" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteWebhookAction.bind(null, e.id)}>
                      <button
                        type="submit"
                        className="label-mono text-coral hover:text-cream"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="label-mono">Recent deliveries</p>
          <form action={retryDeliveriesAction}>
            <button type="submit" className="label-mono hover:text-cream">
              Retry pending
            </button>
          </form>
        </div>
        {deliveries.length === 0 ? (
          <p className="text-muted text-sm">No deliveries yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {deliveries.map((d) => (
              <li
                key={d.id}
                className={`label-mono p-2 rounded border ${
                  d.delivered_at
                    ? "border-mint/30"
                    : d.attempt >= 5
                    ? "border-coral/40"
                    : "border-line"
                }`}
              >
                <span className="text-cream">{d.event_name}</span> ·{" "}
                {d.delivered_at ? (
                  <span className="text-mint">{d.status_code} delivered</span>
                ) : (
                  <span className="text-coral">
                    attempt {d.attempt}/5 {d.last_error ? `· ${d.last_error.slice(0, 60)}` : ""}
                  </span>
                )}{" "}
                · {new Date(d.created_at).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
