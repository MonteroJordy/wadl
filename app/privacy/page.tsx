import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";

export const metadata = {
  title: "Privacy — WADL",
  description: "How WADL handles guest data, what we collect, and how to exercise your rights.",
};

const LAST_UPDATED = "April 30, 2026";

export default function PrivacyPage() {
  return (
    <>
      <main className="bg-bg text-cream min-h-screen">
        <header className="px-6 md:px-12 pt-6 pb-4 flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="font-display text-2xl text-coral tracking-wide">
            WADL
          </Link>
          <Link href="/" className="label-mono hover:text-cream">
            ← Home
          </Link>
        </header>

        <article className="px-6 md:px-12 py-8 max-w-3xl mx-auto prose-wadl">
          <p className="label-mono mb-2">Last updated {LAST_UPDATED}</p>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-wide mb-6">
            Privacy policy
          </h1>

          <p className="text-cream/80 leading-relaxed mb-6">
            WADL (&quot;we&quot;, &quot;us&quot;) helps nightlife operators run guest lists.
            Running a guest list means handling people&apos;s names and phone numbers.
            We take that seriously. This page explains what we collect, why,
            who we share it with, how long we keep it, and how to make us delete it.
          </p>

          <h2 id="what">1. What we collect</h2>
          <p>
            We collect different things from different people:
          </p>
          <ul>
            <li>
              <strong>Operators (account owners + staff):</strong> name, phone,
              email (optional), the venues and events you create, photos you
              upload, billing info if you upgrade.
            </li>
            <li>
              <strong>Guests on a list:</strong> name and phone (always),
              email (optional), tier and +1 count, any notes or tags an operator
              attaches, scan history at the door.
            </li>
            <li>
              <strong>Visitors:</strong> standard server logs (IP, user-agent,
              path, timestamp). Used for security + abuse prevention.
            </li>
          </ul>

          <h2 id="why">2. Why we collect it</h2>
          <p>
            Names and phones run the door. Tier and +1 counts let us enforce
            capacity. Scan history lets operators see who actually showed up.
            Email is optional and used only for receipts, password resets, and
            tickets you explicitly ask us to send. Visitor logs are kept short.
          </p>

          <h2 id="share">3. Who we share with</h2>
          <p>
            We share data only with the third parties that make WADL work:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — hosts our database. Data lives in US
              regions.
            </li>
            <li>
              <strong>Vercel</strong> — hosts our web app + serverless functions.
            </li>
            <li>
              <strong>Twilio</strong> — sends transactional SMS (your QR, opt-in
              confirmations).
            </li>
            <li>
              <strong>Resend</strong> — sends transactional email (operator
              invites, receipts).
            </li>
            <li>
              <strong>Stripe</strong> — handles billing if you&apos;re on a paid
              plan. Card data never touches our servers.
            </li>
            <li>
              <strong>Anthropic</strong> — runs Chat Hub AI parsing (only when
              an operator pastes text into Chat Hub).
            </li>
          </ul>
          <p>
            We never sell your data to advertisers. We never share it with
            anyone outside the list above without your explicit consent or a
            valid legal request.
          </p>

          <h2 id="retention">4. How long we keep it</h2>
          <ul>
            <li>
              <strong>Account + venue + event records</strong> — for as long as
              the account exists. You can delete your account any time
              (jmontero@mainframeagency.com).
            </li>
            <li>
              <strong>Guest records</strong> — 180 days after the event ends, then
              soft-deleted. You can request earlier deletion.
            </li>
            <li>
              <strong>Audit log + error log</strong> — 180 days, then hard-deleted.
            </li>
            <li>
              <strong>Server logs</strong> — 30 days.
            </li>
          </ul>

          <h2 id="sms">5. SMS opt-in &amp; opt-out (TCPA)</h2>
          <p>
            When a guest RSVPs, the form has a clear opt-in checkbox: <em>&quot;I
            consent to receive SMS messages from WADL about my ticket and
            event updates&quot;</em>. The checkbox is visible and explicit. Replying
            STOP to any WADL SMS opts you out forever; we never re-contact
            opted-out numbers without an explicit re-opt-in.
          </p>

          <h2 id="rights">6. Your rights (CCPA / GDPR summary)</h2>
          <ul>
            <li>
              <strong>Access</strong> — request a copy of everything we have on
              you.
            </li>
            <li>
              <strong>Deletion</strong> — request we delete your account and
              all associated records.
            </li>
            <li>
              <strong>Correction</strong> — fix anything that&apos;s wrong.
            </li>
            <li>
              <strong>Portability</strong> — get your data as CSV / JSON.
            </li>
            <li>
              <strong>Opt-out of sale</strong> — we don&apos;t sell data, so this
              is moot, but here it is.
            </li>
          </ul>
          <p>
            Email <a href="mailto:jmontero@mainframeagency.com" className="text-coral">jmontero@mainframeagency.com</a> for any of these. We respond
            within 30 days.
          </p>

          <h2 id="cookies">7. Cookies</h2>
          <p>
            We use session cookies for sign-in (essential) and a single
            preference cookie to remember your cookie-banner choice. We do not
            use third-party advertising cookies. We use minimal first-party
            analytics that respect your reject-non-essential choice.
          </p>

          <h2 id="contact">8. Contact</h2>
          <p>
            <a href="mailto:jmontero@mainframeagency.com" className="text-coral">
              jmontero@mainframeagency.com
            </a>{" "}
            — for any privacy question, takedown, or data request.
          </p>
        </article>
      </main>
      <MarketingFooter />
      <style>{`
        .prose-wadl h2 {
          font-family: var(--font-bebas), sans-serif;
          font-size: 1.5rem;
          color: #FF4A2B;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .prose-wadl p, .prose-wadl li {
          color: rgba(242, 237, 228, 0.8);
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
          color: #F2EDE4;
        }
      `}</style>
    </>
  );
}
