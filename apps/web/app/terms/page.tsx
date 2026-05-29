import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Terms — WADL",
  description: "Terms of service for WADL.",
};

const LAST_UPDATED = "April 30, 2026";

const H2: React.CSSProperties = {
  marginTop: "var(--s-10)",
  marginBottom: "var(--s-3)",
};
const P: React.CSSProperties = { marginTop: "var(--s-3)" };

function PublicHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(12px)",
        background: "rgba(10,10,10,0.78)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--s-3) var(--s-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--s-4)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
        <nav
          style={{ display: "flex", alignItems: "center", gap: "var(--s-4)" }}
        >
          <Link
            href="/discover"
            className="t-meta"
            style={{ textDecoration: "none" }}
          >
            Tonight
          </Link>
          <Link
            href="/login"
            className="btn btn--ghost btn--sm"
            style={{ textDecoration: "none" }}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "var(--s-10) var(--s-6)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--s-6)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <Logo size={22} />
          <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
            One door · one list · one truth
          </div>
          <div
            className="t-meta"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-4)" }}
          >
            © {new Date().getFullYear()} WADL · Built in Miami
          </div>
        </div>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-6)" }}>
          {[
            ["Pricing", "/pricing"],
            ["Tonight", "/discover"],
            ["Embed widget", "/docs/embed"],
            ["Privacy", "/privacy"],
            ["Help", "/help"],
            ["Contact", "/contact"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="t-meta"
              style={{ textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default function TermsPage() {
  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PublicHeader />
      <article
        className="legal-prose"
        style={{
          maxWidth: 740,
          margin: "0 auto",
          padding: "var(--s-12) var(--s-6) var(--s-16)",
        }}
      >
        <div className="t-meta">Last updated · {LAST_UPDATED}</div>
        <h1 className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          Terms of service
        </h1>

        <p className="t-body-2" style={{ marginTop: "var(--s-6)" }}>
          By using WADL you agree to these terms. They&apos;re short. We tried.
        </p>

        <h2 className="t-h1" style={H2}>
          1. The service
        </h2>
        <p className="t-body-2" style={P}>
          WADL provides software for managing nightlife guest lists, including
          web pages, server APIs, SMS, and email. We aim for high uptime but
          don&apos;t guarantee it. We may change features or pricing with at
          least 30 days notice for paid plans.
        </p>

        <h2 className="t-h1" style={H2}>
          2. Your account
        </h2>
        <p className="t-body-2" style={P}>
          Keep your sign-in credentials secret. Anything done from your account
          is your responsibility. Notify us immediately if you suspect
          unauthorized use.
        </p>

        <h2 className="t-h1" style={H2}>
          3. Acceptable use
        </h2>
        <p className="t-body-2" style={P}>
          You agree not to:
        </p>
        <ul className="legal-ul">
          <li>
            Send unsolicited bulk SMS or email through WADL — only to people who
            explicitly opted in via a WADL form or your own collection with
            verifiable consent.
          </li>
          <li>Use WADL to harass, defame, or otherwise harm anyone.</li>
          <li>
            Reverse-engineer, scrape, or otherwise extract data from WADL
            outside of provided export tools.
          </li>
          <li>
            Resell WADL to third parties without an Enterprise agreement.
          </li>
        </ul>
        <p className="t-body-2" style={P}>
          Violation may result in immediate termination without refund.
        </p>

        <h2 className="t-h1" style={H2}>
          4. Guest data &amp; SMS compliance (TCPA)
        </h2>
        <p className="t-body-2" style={P}>
          You confirm that any phone numbers you upload or import to WADL were
          collected with proper consent. Guests added via WADL forms have an
          opt-in checkbox; you remain responsible for compliance for anything
          imported from outside WADL. Honor STOP requests immediately — WADL
          automatically blocks SMS to opted-out phones.
        </p>

        <h2 className="t-h1" style={H2}>
          5. Payment &amp; refunds
        </h2>
        <p className="t-body-2" style={P}>
          Pro is billed monthly in advance via Stripe. Cancel any time; access
          continues until the end of the current billing period. We don&apos;t
          pro-rate refunds for partial months but can make exceptions for
          billing errors — email us.
        </p>

        <h2 className="t-h1" style={H2}>
          6. Intellectual property
        </h2>
        <p className="t-body-2" style={P}>
          WADL, the brand, and the platform code remain ours. Your event
          content, guest data, and uploads remain yours. You grant us a limited
          license to host, transmit, and process your content strictly to
          deliver the service.
        </p>

        <h2 className="t-h1" style={H2}>
          7. Disclaimers
        </h2>
        <p className="t-body-2" style={P}>
          WADL is provided &quot;as-is&quot;. We don&apos;t guarantee any
          specific result (e.g. that no scammers slip through your door). Use
          the audit log and DNA flag list to manage real-world incidents.
        </p>

        <h2 className="t-h1" style={H2}>
          8. Liability
        </h2>
        <p className="t-body-2" style={P}>
          To the maximum extent permitted by law, our liability is capped at the
          amount you paid us in the prior 12 months (or $100 for free users).
        </p>

        <h2 className="t-h1" style={H2}>
          9. Termination
        </h2>
        <p className="t-body-2" style={P}>
          You can delete your account any time. We can terminate yours for
          material breach with 7 days notice (or immediately for §3 violations).
          On termination, you have 90 days to export data.
        </p>

        <h2 className="t-h1" style={H2}>
          10. Changes to terms
        </h2>
        <p className="t-body-2" style={P}>
          We may update these terms. Material changes get 30 days notice via
          email. Continued use after the effective date counts as acceptance.
        </p>

        <h2 className="t-h1" style={H2}>
          11. Governing law
        </h2>
        <p className="t-body-2" style={P}>
          Florida, USA. Disputes resolved in Miami-Dade County courts.
        </p>

        <h2 className="t-h1" style={H2}>
          12. Contact
        </h2>
        <p className="t-body-2" style={P}>
          <a
            href="mailto:jmontero@mainframeagency.com"
            style={{ color: "var(--fg)" }}
          >
            jmontero@mainframeagency.com
          </a>
        </p>
      </article>
      <PublicFooter />
      <style>{`
        .legal-ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-top: var(--s-3);
          display: flex;
          flex-direction: column;
          gap: var(--s-2);
        }
        .legal-ul li {
          font-size: var(--ts-sm);
          line-height: 1.6;
          color: var(--fg-2);
        }
      `}</style>
    </main>
  );
}
