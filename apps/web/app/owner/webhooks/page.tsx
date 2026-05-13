import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
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
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">DEV</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Webhooks
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            POSTs to your URL when events fire. HMAC-SHA256 signed. Backoff on
            failure.
          </p>
        </div>

        <CreateWebhookForm />

        <section style={{ marginTop: 24 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            ENDPOINTS
          </div>
          {endpoints.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              No endpoints yet.
            </p>
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
              {endpoints.map((e) => (
                <li key={e.id} className="w-card" style={{ padding: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontFamily: "var(--w-mono)",
                          fontSize: 13,
                          color: "var(--w-fg)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {e.url}
                      </p>
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 6 }}
                      >
                        EVENTS:{" "}
                        <span style={{ color: "var(--w-fg)" }}>
                          {e.events}
                        </span>{" "}
                        ·{" "}
                        {e.active ? (
                          <span style={{ color: "var(--w-ok)" }}>ACTIVE</span>
                        ) : (
                          <span style={{ color: "var(--w-fg-muted)" }}>
                            PAUSED
                          </span>
                        )}
                      </div>
                      <div
                        className="w-type-meta"
                        style={{
                          marginTop: 6,
                          wordBreak: "break-all",
                        }}
                      >
                        SECRET:{" "}
                        <span style={{ color: "var(--w-fg)" }}>
                          {e.secret}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <form
                        action={toggleWebhookAction.bind(null, e.id, !e.active)}
                      >
                        <InlineFormSubmit
                          className="w-type-meta"
                          pendingLabel="…"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--w-fg)",
                            padding: 0,
                          }}
                        >
                          {e.active ? "PAUSE" : "ACTIVATE"}
                        </InlineFormSubmit>
                      </form>
                      <form action={deleteWebhookAction.bind(null, e.id)}>
                        <InlineFormSubmit
                          className="w-type-meta"
                          pendingLabel="…"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--w-err)",
                            padding: 0,
                          }}
                        >
                          DELETE
                        </InlineFormSubmit>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div className="w-type-meta">RECENT DELIVERIES</div>
            <form action={retryDeliveriesAction}>
              <InlineFormSubmit
                className="w-type-meta"
                pendingLabel="RETRYING…"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--w-acc)",
                  padding: 0,
                }}
              >
                RETRY PENDING
              </InlineFormSubmit>
            </form>
          </div>
          {deliveries.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              No deliveries yet.
            </p>
          ) : (
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {deliveries.map((d) => {
                const borderColor = d.delivered_at
                  ? "var(--w-ok)"
                  : d.attempt >= 5
                    ? "var(--w-err)"
                    : "var(--w-line)";
                return (
                  <li
                    key={d.id}
                    className="w-type-meta"
                    style={{
                      padding: 10,
                      border: `1px solid ${borderColor}`,
                      background: "var(--w-surface-1)",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--w-fg)",
                        fontFamily: "var(--w-mono)",
                      }}
                    >
                      {d.event_name}
                    </span>{" "}
                    ·{" "}
                    {d.delivered_at ? (
                      <span style={{ color: "var(--w-ok)" }}>
                        {d.status_code} DELIVERED
                      </span>
                    ) : (
                      <span style={{ color: "var(--w-err)" }}>
                        ATTEMPT {d.attempt}/5
                        {d.last_error ? ` · ${d.last_error.slice(0, 60)}` : ""}
                      </span>
                    )}{" "}
                    · {new Date(d.created_at).toLocaleTimeString()}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
