import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";

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
      <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
        <p className="label-mono mb-1">Promoter payouts</p>
        <h1 className="display-lg leading-[0.95] mb-6">Coming soon</h1>
        <EmptyState
          title="Stripe Connect not enabled"
          body="Set STRIPE_CONNECT_CLIENT_ID on the deployment to enable promoter payout flows. Each promoter onboards via Stripe Connect Express and gets paid commission per scanned-in head."
          action={
            <a
              href="mailto:jmontero@mainframeagency.com?subject=Enable%20Stripe%20Connect"
              className="btn-primary inline-block"
            >
              Email support
            </a>
          }
        />
      </main>
    );
  }

  // Read connect_accounts row (if any) so the page reflects real state.
  const admin = createAdminClient();
  const { data: connect } = await admin
    .from("connect_accounts")
    .select(
      "stripe_account_id, charges_enabled, payouts_enabled, details_submitted, default_currency, email, country, updated_at"
    )
    .eq("account_id", account.id)
    .maybeSingle<ConnectRow>();

  const ready = !!connect && connect.charges_enabled && connect.payouts_enabled;
  const inProgress =
    !!connect &&
    !ready &&
    (connect.details_submitted || connect.charges_enabled || connect.payouts_enabled);

  const oauthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${process.env.STRIPE_CONNECT_CLIENT_ID}&scope=read_write&stripe_user[email]=${encodeURIComponent(
    "" /* prefilled by Stripe from current session if available */
  )}`;

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
      <p className="label-mono mb-1">Promoter payouts</p>
      <h1 className="display-lg leading-[0.95] mb-2">Payouts</h1>
      <p className="text-muted text-sm mb-6">{account.display_name}</p>

      {searchParams.connect === "ok" && (
        <div className="card border-mint mb-4 bg-s2">
          <p className="label-mono text-mint mb-1">Connected</p>
          <p className="text-cream text-sm">
            Stripe account linked. Status will update once onboarding finishes.
          </p>
        </div>
      )}
      {searchParams.connect_error && (
        <div className="card border-coral mb-4 bg-s2">
          <p className="label-mono text-coral mb-1">Connect error</p>
          <p className="text-cream text-sm break-words">
            {searchParams.connect_error.replace(/_/g, " ")}
          </p>
        </div>
      )}

      <section className="card mb-4">
        <p className="label-mono mb-2">Status</p>
        {ready ? (
          <>
            <p className="font-sans text-cream font-semibold mb-1">Ready to receive payouts</p>
            <p className="text-muted text-xs mb-3 font-mono">
              {connect?.stripe_account_id} · {(connect?.country ?? "").toUpperCase()} ·{" "}
              {(connect?.default_currency ?? "").toUpperCase()}
            </p>
            <p className="text-muted text-sm">
              Promoter payouts will fire weekly based on scanned-in heads × commission rate.
            </p>
          </>
        ) : inProgress ? (
          <>
            <p className="font-sans text-cream font-semibold mb-1">Onboarding in progress</p>
            <ul className="text-xs text-muted mb-3 space-y-1">
              <li>Details submitted: {connect?.details_submitted ? "yes" : "no"}</li>
              <li>Charges enabled: {connect?.charges_enabled ? "yes" : "no"}</li>
              <li>Payouts enabled: {connect?.payouts_enabled ? "yes" : "no"}</li>
            </ul>
            <p className="text-muted text-sm mb-4">
              Stripe is still verifying your business. We&apos;ll auto-update this card the
              moment your dashboard flips green.
            </p>
            <a href={oauthUrl} className="btn-ghost inline-block">
              Resume onboarding
            </a>
          </>
        ) : (
          <>
            <p className="font-sans text-cream font-semibold mb-1">Connect onboarding pending</p>
            <p className="text-muted text-sm mb-4">
              Complete Stripe&apos;s Express onboarding to start receiving promoter commissions.
            </p>
            <a href={oauthUrl} className="btn-primary inline-block">
              Connect Stripe account
            </a>
          </>
        )}
      </section>

      <section className="card">
        <p className="label-mono mb-2">How it works</p>
        <ul className="text-muted text-sm space-y-1 list-disc list-inside">
          <li>Each promoter onboards via Stripe Connect Express</li>
          <li>WADL tracks scanned-in heads per promoter (scorecards)</li>
          <li>Commission rate per allocation set on the allocation page</li>
          <li>Payouts triggered weekly</li>
        </ul>
      </section>
    </main>
  );
}
