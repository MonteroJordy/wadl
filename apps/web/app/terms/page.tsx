import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";

export const metadata = {
  title: "Terms — WADL",
  description: "Terms of service for WADL.",
};

const LAST_UPDATED = "April 30, 2026";

export default function TermsPage() {
  return (
    <>
      <PublicShell maxWidth="4xl" ambient>
        <article className="prose-wadl">
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            LAST UPDATED · {LAST_UPDATED.toUpperCase()}
          </div>
          <h1
            className="w-type-display-md"
            style={{ marginBottom: 32, lineHeight: 0.94 }}
          >
            Terms of service
          </h1>

          <p>
            By using WADL you agree to these terms. They&apos;re short. We tried.
          </p>

          <h2>1. The service</h2>
          <p>
            WADL provides software for managing nightlife guest lists, including
            web pages, server APIs, SMS, and email. We aim for high uptime but
            don&apos;t guarantee it. We may change features or pricing with at least
            30 days notice for paid plans.
          </p>

          <h2>2. Your account</h2>
          <p>
            Keep your sign-in credentials secret. Anything done from your
            account is your responsibility. Notify us immediately if you suspect
            unauthorized use.
          </p>

          <h2>3. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Send unsolicited bulk SMS or email through WADL — only to people
              who explicitly opted in via a WADL form or your own collection
              with verifiable consent.
            </li>
            <li>
              Use WADL to harass, defame, or otherwise harm anyone.
            </li>
            <li>
              Reverse-engineer, scrape, or otherwise extract data from WADL
              outside of provided export tools.
            </li>
            <li>
              Resell WADL to third parties without an Enterprise agreement.
            </li>
          </ul>
          <p>
            Violation may result in immediate termination without refund.
          </p>

          <h2>4. Guest data &amp; SMS compliance (TCPA)</h2>
          <p>
            You confirm that any phone numbers you upload or import to WADL
            were collected with proper consent. Guests added via WADL forms
            have an opt-in checkbox; you remain responsible for compliance for
            anything imported from outside WADL. Honor STOP requests immediately —
            WADL automatically blocks SMS to opted-out phones.
          </p>

          <h2>5. Payment &amp; refunds</h2>
          <p>
            Pro is billed monthly in advance via Stripe. Cancel any time;
            access continues until the end of the current billing period. We
            don&apos;t pro-rate refunds for partial months but can make exceptions
            for billing errors — email us.
          </p>

          <h2>6. Intellectual property</h2>
          <p>
            WADL, the brand, and the platform code remain ours. Your event
            content, guest data, and uploads remain yours. You grant us a
            limited license to host, transmit, and process your content
            strictly to deliver the service.
          </p>

          <h2>7. Disclaimers</h2>
          <p>
            WADL is provided &quot;as-is&quot;. We don&apos;t guarantee any specific result
            (e.g. that no scammers slip through your door). Use the audit log
            and DNA flag list to manage real-world incidents.
          </p>

          <h2>8. Liability</h2>
          <p>
            To the maximum extent permitted by law, our liability is capped at
            the amount you paid us in the prior 12 months (or $100 for free
            users).
          </p>

          <h2>9. Termination</h2>
          <p>
            You can delete your account any time. We can terminate yours for
            material breach with 7 days notice (or immediately for §3
            violations). On termination, you have 90 days to export data.
          </p>

          <h2>10. Changes to terms</h2>
          <p>
            We may update these terms. Material changes get 30 days notice
            via email. Continued use after the effective date counts as
            acceptance.
          </p>

          <h2>11. Governing law</h2>
          <p>
            Florida, USA. Disputes resolved in Miami-Dade County courts.
          </p>

          <h2>12. Contact</h2>
          <p>
            <a
              href="mailto:jmontero@mainframeagency.com"
              style={{ color: "var(--w-acc)" }}
            >
              jmontero@mainframeagency.com
            </a>
          </p>
        </article>
      </PublicShell>
      <MarketingFooter />
      <style>{`
        .prose-wadl h2 {
          font-family: var(--w-display);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--w-fg);
          letter-spacing: -0.02em;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .prose-wadl p,
        .prose-wadl li {
          color: var(--w-fg-muted);
          line-height: 1.65;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        .prose-wadl ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 1rem;
        }
        .prose-wadl strong {
          color: var(--w-fg);
        }
      `}</style>
    </>
  );
}
