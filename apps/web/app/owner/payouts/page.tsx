import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

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
        style={{ minHeight: "100vh", background: "var(--bg)" }}
      >
        <PageHeader eyebrow="Promoter payouts" title="Coming soon" />
        <div style={{ padding: "var(--s-8)", maxWidth: 720 }}>
          <section
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-display-sm">Pay your promoters</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 480,
                marginInline: "auto",
              }}
            >
              Stripe Connect is wired but not turned on yet. Each holder
              onboards via Express; commission per scanned head pays out
              weekly. Email when you want it live.
            </p>
            <a
              href="mailto:jmontero@mainframeagency.com?subject=Turn%20on%20Stripe%20Connect"
              className="btn btn--ghost"
              style={{ marginTop: "var(--s-5)" }}
            >
              Email the founder
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
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Promoter payouts"
        title="Payouts"
        sub={account.display_name}
      />
      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
        }}
      >
        {searchParams.connect === "ok" && (
          <div
            className="card"
            style={{
              padding: "var(--s-4)",
              borderColor: "var(--ok)",
            }}
          >
            <div
              className="t-meta"
              style={{ color: "var(--ok)", marginBottom: "var(--s-1)" }}
            >
              Connected
            </div>
            <p className="t-body">
              Stripe account linked. Status will update once onboarding
              finishes.
            </p>
          </div>
        )}
        {searchParams.connect_error && (
          <div
            className="card"
            style={{
              padding: "var(--s-4)",
              borderColor: "var(--err)",
            }}
          >
            <div
              className="t-meta"
              style={{ color: "var(--err)", marginBottom: "var(--s-1)" }}
            >
              Connect error
            </div>
            <p className="t-body" style={{ wordBreak: "break-word" }}>
              {searchParams.connect_error.replace(/_/g, " ")}
            </p>
          </div>
        )}

        <section className="card" style={{ padding: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Status
          </div>
          {ready ? (
            <>
              <p className="t-h2" style={{ marginBottom: "var(--s-1)" }}>
                Ready to receive payouts
              </p>
              <p
                className="t-meta"
                style={{
                  fontFamily: "var(--mono)",
                  marginBottom: "var(--s-3)",
                }}
              >
                {connect?.stripe_account_id} ·{" "}
                {(connect?.country ?? "").toUpperCase()} ·{" "}
                {(connect?.default_currency ?? "").toUpperCase()}
              </p>
              <p className="t-body-2">
                Promoter payouts will fire weekly based on scanned-in heads ×
                commission rate.
              </p>
            </>
          ) : inProgress ? (
            <>
              <p className="t-h2" style={{ marginBottom: "var(--s-2)" }}>
                Onboarding in progress
              </p>
              <ul
                className="t-meta"
                style={{
                  marginBottom: "var(--s-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--s-1)",
                  listStyle: "none",
                  padding: 0,
                }}
              >
                <li>
                  Details submitted:{" "}
                  {connect?.details_submitted ? "yes" : "no"}
                </li>
                <li>
                  Charges enabled:{" "}
                  {connect?.charges_enabled ? "yes" : "no"}
                </li>
                <li>
                  Payouts enabled:{" "}
                  {connect?.payouts_enabled ? "yes" : "no"}
                </li>
              </ul>
              <p
                className="t-body-2"
                style={{ marginBottom: "var(--s-4)" }}
              >
                Stripe is still verifying your business. We&apos;ll auto-update
                this card the moment your dashboard flips green.
              </p>
              <a href={oauthUrl} className="btn btn--ghost">
                Resume onboarding
              </a>
            </>
          ) : (
            <>
              <p className="t-h2" style={{ marginBottom: "var(--s-1)" }}>
                Connect onboarding pending
              </p>
              <p
                className="t-body-2"
                style={{ marginBottom: "var(--s-4)" }}
              >
                Complete Stripe&apos;s Express onboarding to start receiving
                promoter commissions.
              </p>
              <a href={oauthUrl} className="btn btn--accent">
                Connect Stripe account
              </a>
            </>
          )}
        </section>

        <section className="card" style={{ padding: "var(--s-6)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            How it works
          </div>
          <ul
            className="t-body-2"
            style={{
              lineHeight: 1.7,
              listStyle: "disc",
              paddingLeft: "var(--s-5)",
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
