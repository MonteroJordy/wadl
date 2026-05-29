import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Privacy — WADL",
  description:
    "How WADL handles guest data, what we collect, and how to exercise your rights.",
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
            ["Terms", "/terms"],
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

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PublicHeader />
      <article
        style={{
          maxWidth: 740,
          margin: "0 auto",
          padding: "var(--s-12) var(--s-6) var(--s-16)",
        }}
      >
        <div className="t-meta">Last updated · {LAST_UPDATED}</div>
        <h1 className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          Privacy policy
        </h1>

        <p className="t-body" style={{ marginTop: "var(--s-6)" }}>
          WADL (&quot;we&quot;, &quot;us&quot;) helps nightlife operators run
          guest lists. Running a guest list means handling people&apos;s names
          and phone numbers. We take that seriously. This page explains what we
          collect, why, who we share it with, how long we keep it, and how to
          make us delete it.
        </p>

        <h2 className="t-h1" style={H2} id="what">
          1. What we collect
        </h2>
        <p className="t-body-2" style={P}>
          We collect different things from different people:
        </p>
        <ul className="legal-ul">
          <li>
            <strong style={{ color: "var(--fg)" }}>
              Operators (account owners + staff):
            </strong>{" "}
            name, phone, email (optional), the venues and events you create,
            photos you upload, billing info if you upgrade.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Guests on a list:</strong>{" "}
            name and phone (always), email (optional), tier and +1 count, any
            notes or tags an operator attaches, scan history at the door.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Visitors:</strong> standard
            server logs (IP, user-agent, path, timestamp). Used for security +
            abuse prevention.
          </li>
        </ul>

        <h2 className="t-h1" style={H2} id="why">
          2. Why we collect it
        </h2>
        <p className="t-body-2" style={P}>
          Names and phones run the door. Tier and +1 counts let us enforce
          capacity. Scan history lets operators see who actually showed up.
          Email is optional and used only for receipts, password resets, and
          tickets you explicitly ask us to send. Visitor logs are kept short.
        </p>

        <h2 className="t-h1" style={H2} id="share">
          3. Who we share with
        </h2>
        <p className="t-body-2" style={P}>
          We share data only with the third parties that make WADL work:
        </p>
        <ul className="legal-ul">
          <li>
            <strong style={{ color: "var(--fg)" }}>Supabase</strong> — hosts our
            database. Data lives in US regions.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Vercel</strong> — hosts our
            web app + serverless functions.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Twilio</strong> — sends
            transactional SMS (your QR, opt-in confirmations).
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Resend</strong> — sends
            transactional email (operator invites, receipts).
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Stripe</strong> — handles
            billing if you&apos;re on a paid plan. Card data never touches our
            servers.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Anthropic</strong> — runs
            Chat Hub AI parsing (only when an operator pastes text into Chat
            Hub).
          </li>
        </ul>
        <p className="t-body-2" style={P}>
          We never sell your data to advertisers. We never share it with anyone
          outside the list above without your explicit consent or a valid legal
          request.
        </p>

        <h2 className="t-h1" style={H2} id="retention">
          4. How long we keep it
        </h2>
        <ul className="legal-ul">
          <li>
            <strong style={{ color: "var(--fg)" }}>
              Account + venue + event records
            </strong>{" "}
            — for as long as the account exists. You can delete your account
            any time (jmontero@mainframeagency.com).
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Guest records</strong> — 180
            days after the event ends, then soft-deleted. You can request
            earlier deletion.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>
              Audit log + error log
            </strong>{" "}
            — 180 days, then hard-deleted.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Server logs</strong> — 30
            days.
          </li>
        </ul>

        <h2 className="t-h1" style={H2} id="sms">
          5. SMS opt-in &amp; opt-out (TCPA)
        </h2>
        <p className="t-body-2" style={P}>
          When a guest RSVPs, the form has a clear opt-in checkbox:{" "}
          <em>
            &quot;I consent to receive SMS messages from WADL about my ticket
            and event updates&quot;
          </em>
          . The checkbox is visible and explicit. Replying STOP to any WADL SMS
          opts you out forever; we never re-contact opted-out numbers without an
          explicit re-opt-in.
        </p>

        <h2 className="t-h1" style={H2} id="rights">
          6. Your rights (CCPA / GDPR summary)
        </h2>
        <ul className="legal-ul">
          <li>
            <strong style={{ color: "var(--fg)" }}>Access</strong> — request a
            copy of everything we have on you.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Deletion</strong> — request
            we delete your account and all associated records.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Correction</strong> — fix
            anything that&apos;s wrong.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Portability</strong> — get
            your data as CSV / JSON.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Opt-out of sale</strong> — we
            don&apos;t sell data, so this is moot, but here it is.
          </li>
        </ul>
        <p className="t-body-2" style={P}>
          Email{" "}
          <a
            href="mailto:jmontero@mainframeagency.com"
            style={{ color: "var(--fg)" }}
          >
            jmontero@mainframeagency.com
          </a>{" "}
          for any of these. We respond within 30 days.
        </p>

        <h2 className="t-h1" style={H2} id="cookies">
          7. Cookies
        </h2>
        <p className="t-body-2" style={P}>
          We use session cookies for sign-in (essential) and a single
          preference cookie to remember your cookie-banner choice. We do not use
          third-party advertising cookies. We use minimal first-party analytics
          that respect your reject-non-essential choice.
        </p>

        <h2 className="t-h1" style={H2} id="contact">
          8. Contact
        </h2>
        <p className="t-body-2" style={P}>
          <a
            href="mailto:jmontero@mainframeagency.com"
            style={{ color: "var(--fg)" }}
          >
            jmontero@mainframeagency.com
          </a>{" "}
          — for any privacy question, takedown, or data request.
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
