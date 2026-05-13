import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/wadl";

export const dynamic = "force-dynamic";

interface ConnectRow {
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency: string | null;
  email: string | null;
  country: string | null;
  updated_at: string;
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: { connect?: string; connect_error?: string };
}) {
  const { account } = await requireOwnerContext();
  const enabled = !!process.env.STRIPE_CONNECT_CLIENT_ID;

  if (!enabled) {
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
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="w-type-meta">PROMOTER PAYOUTS</div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 8, marginBottom: 24 }}
          >
            Coming soon
          </div>
          <section
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">Pay your promoters</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 480,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Stripe Connect is wired but not turned on yet. Each holder
              onboards via Express; commission per scanned head pays out
              weekly. Email when you want it live.
            </p>
            <a
              href="mailto:jmontero@mainframeagency.com?subject=Turn%20on%20Stripe%20Connect"
              style={{ textDecoration: "none" }}
            >
              <Button
                variant="ghost"
                style={{ marginTop: 20 }}
              >
                Email the founder
              </Button>
            </a>
          </section>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: connect } = await admin
    .from("connect_accounts")
    .select(
      "stripe_account_id, charges_enabled, payouts_enabled, details_submitted, default_currency, email, country, updated_at",
    )
    .eq("account_id", account.id)
    .maybeSingle<ConnectRow>();

  const ready =
    !!connect && connect.charges_enabled && connect.payouts_enabled;
  const inProgress =
    !!connect &&
    !ready &&
    (connect.details_submitted ||
      connect.charges_enabled ||
      connect.payouts_enabled);

  const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CONNECT_CLIENT_ID}&scope=read_write&stripe_user[email]=${encodeURIComponent("")}`;

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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">PROMOTER PAYOUTS</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Payouts
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            {account.display_name}
          </p>
        </div>

        {searchParams.connect === "ok" && (
          <div
            className="w-card"
            style={{
              padding: 16,
              borderColor: "var(--w-ok)",
              background: "var(--w-surface-2)",
              marginBottom: 12,
            }}
          >
            <div
              className="w-type-meta"
              style={{ color: "var(--w-ok)", marginBottom: 4 }}
            >
              CONNECTED
            </div>
            <p style={{ color: "var(--w-fg)", fontSize: 14 }}>
              Stripe account linked. Status will update once onboarding
              finishes.
            </p>
          </div>
        )}
        {searchParams.connect_error && (
          <div
            className="w-card"
            style={{
              padding: 16,
              borderColor: "var(--w-err)",
              background: "var(--w-surface-2)",
              marginBottom: 12,
            }}
          >
            <div
              className="w-type-meta"
              style={{ color: "var(--w-err)", marginBottom: 4 }}
            >
              CONNECT ERROR
            </div>
            <p
              style={{
                color: "var(--w-fg)",
                fontSize: 14,
                wordBreak: "break-word",
              }}
            >
              {searchParams.connect_error.replace(/_/g, " ")}
            </p>
          </div>
        )}

        <section
          className="w-card"
          style={{ padding: 20, marginBottom: 12 }}
        >
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            STATUS
          </div>
          {ready ? (
            <>
              <p
                style={{
                  color: "var(--w-fg)",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Ready to receive payouts
              </p>
              <p
                className="w-type-meta"
                style={{
                  color: "var(--w-fg-muted)",
                  fontFamily: "var(--w-mono)",
                  marginBottom: 12,
                }}
              >
                {connect?.stripe_account_id} ·{" "}
                {(connect?.country ?? "").toUpperCase()} ·{" "}
                {(connect?.default_currency ?? "").toUpperCase()}
              </p>
              <p
                style={{
                  color: "var(--w-fg-muted)",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Promoter payouts will fire weekly based on scanned-in heads ×
                commission rate.
              </p>
            </>
          ) : inProgress ? (
            <>
              <p
                style={{
                  color: "var(--w-fg)",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Onboarding in progress
              </p>
              <ul
                style={{
                  fontSize: 12,
                  color: "var(--w-fg-muted)",
                  marginBottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontFamily: "var(--w-mono)",
                }}
              >
                <li>
                  DETAILS SUBMITTED:{" "}
                  {connect?.details_submitted ? "YES" : "NO"}
                </li>
                <li>
                  CHARGES ENABLED:{" "}
                  {connect?.charges_enabled ? "YES" : "NO"}
                </li>
                <li>
                  PAYOUTS ENABLED:{" "}
                  {connect?.payouts_enabled ? "YES" : "NO"}
                </li>
              </ul>
              <p
                style={{
                  color: "var(--w-fg-muted)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                Stripe is still verifying your business. We&apos;ll auto-update
                this card the moment your dashboard flips green.
              </p>
              <a href={oauthUrl} style={{ textDecoration: "none" }}>
                <Button variant="ghost">Resume onboarding</Button>
              </a>
            </>
          ) : (
            <>
              <p
                style={{
                  color: "var(--w-fg)",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Connect onboarding pending
              </p>
              <p
                style={{
                  color: "var(--w-fg-muted)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                Complete Stripe&apos;s Express onboarding to start receiving
                promoter commissions.
              </p>
              <a href={oauthUrl} style={{ textDecoration: "none" }}>
                <Button variant="primary">Connect Stripe account</Button>
              </a>
            </>
          )}
        </section>

        <section className="w-card" style={{ padding: 20 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            HOW IT WORKS
          </div>
          <ul
            style={{
              color: "var(--w-fg-muted)",
              fontSize: 14,
              lineHeight: 1.7,
              listStyle: "disc",
              paddingLeft: 18,
            }}
          >
            <li>Each promoter onboards via Stripe Connect Express</li>
            <li>WADL tracks scanned-in heads per promoter (scorecards)</li>
            <li>Commission rate per allocation set on the allocation page</li>
            <li>Payouts triggered weekly</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
