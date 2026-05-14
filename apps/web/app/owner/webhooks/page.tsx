import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";
import CreateWebhookForm from "./create-form";
import { InlineFormSubmit } from "@/components/form-submit";
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
        "id, endpoint_id, event_name, status_code, attempt, delivered_at, last_error, created_at, endpoint:webhook_endpoints!inner(account_id)",
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
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Dev"
        title="Webhooks"
        sub="POSTs to your URL when events fire. HMAC-SHA256 signed. Backoff on failure."
      />
      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 880,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-6)",
        }}
      >
        <CreateWebhookForm />

        <section>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Endpoints
          </div>
          {endpoints.length === 0 ? (
            <p className="t-body-2">No endpoints yet.</p>
          ) : (
            <div className="card">
              {endpoints.map((e) => (
                <div
                  key={e.id}
                  className="row"
                  style={{ gridTemplateColumns: "1fr auto" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="t-body truncate"
                      style={{ fontFamily: "var(--mono)", fontSize: 13 }}
                    >
                      {e.url}
                    </p>
                    <div
                      className="t-meta"
                      style={{ marginTop: "var(--s-1)" }}
                    >
                      Events:{" "}
                      <span style={{ color: "var(--fg)" }}>{e.events}</span> ·{" "}
                      {e.active ? (
                        <span style={{ color: "var(--ok)" }}>active</span>
                      ) : (
                        <span style={{ color: "var(--fg-3)" }}>paused</span>
                      )}
                    </div>
                    <div
                      className="t-meta"
                      style={{
                        marginTop: "var(--s-1)",
                        wordBreak: "break-all",
                      }}
                    >
                      Secret:{" "}
                      <span style={{ color: "var(--fg)" }}>{e.secret}</span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--s-1)",
                      flexShrink: 0,
                      alignItems: "flex-end",
                    }}
                  >
                    <form
                      action={toggleWebhookAction.bind(null, e.id, !e.active)}
                    >
                      <InlineFormSubmit
                        className="t-meta"
                        pendingLabel="…"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--fg)",
                          padding: 0,
                        }}
                      >
                        {e.active ? "Pause" : "Activate"}
                      </InlineFormSubmit>
                    </form>
                    <form action={deleteWebhookAction.bind(null, e.id)}>
                      <InlineFormSubmit
                        className="t-meta"
                        pendingLabel="…"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--err)",
                          padding: 0,
                        }}
                      >
                        Delete
                      </InlineFormSubmit>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--s-3)",
            }}
          >
            <div className="t-meta">Recent deliveries</div>
            <form action={retryDeliveriesAction}>
              <InlineFormSubmit
                className="t-meta"
                pendingLabel="Retrying…"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--fg)",
                  padding: 0,
                }}
              >
                Retry pending
              </InlineFormSubmit>
            </form>
          </div>
          {deliveries.length === 0 ? (
            <p className="t-body-2">No deliveries yet.</p>
          ) : (
            <div className="card">
              {deliveries.map((d) => (
                <div
                  key={d.id}
                  className="row"
                  style={{ gridTemplateColumns: "1fr auto auto" }}
                >
                  <span
                    className="t-body-2"
                    style={{ fontFamily: "var(--mono)", color: "var(--fg)" }}
                  >
                    {d.event_name}
                  </span>
                  {d.delivered_at ? (
                    <span className="chip chip--ok">
                      {d.status_code} delivered
                    </span>
                  ) : (
                    <span
                      className={
                        "chip " +
                        (d.attempt >= 5 ? "chip--err" : "chip--warn")
                      }
                    >
                      Attempt {d.attempt}/5
                    </span>
                  )}
                  <span className="t-meta">
                    {new Date(d.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
