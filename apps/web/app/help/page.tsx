import Link from "next/link";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Help — WADL",
  description:
    "How WADL works at the door, and how to get help when it doesn't.",
};

const FAQS = [
  {
    q: "I'm at the door and the scanner won't read a QR.",
    a: "Tap SEARCH and find the guest by name — that gets the line moving. Then check that the guest's phone brightness is up and the QR fills the camera. If a real guest's QR keeps refusing, check /owner/sms-log for that phone — the QR may not have been delivered. Last resort: have the door manager use Owner override on the daydash.",
  },
  {
    q: "A promoter says they sent a name but it's not on my list.",
    a: "Open /owner/events/[id]/audit and search the name. Every add (whether by the holder, you, or a co-owner) is logged with attribution. If it's truly missing, check the holder's allocation page — caps may be hit, or the list may have closed.",
  },
  {
    q: "I want to bump someone from GA to VIP at the door.",
    a: "Open the guest detail page from the queue or guest list and set Tier. The guest's Wallet pass / SMS confirmation refreshes on next view. Tier upgrades log to the audit trail.",
  },
  {
    q: "How do I close the list 30 minutes before doors?",
    a: "Open event settings and set the cutoff time per night. WADL stops accepting RSVPs at that timestamp. Existing names stay valid; only new ones are blocked.",
  },
  {
    q: "What happens at capacity?",
    a: "When approved heads cross the lockdown threshold (default 90%), WADL auto-flips the night to frozen — all allocations close, no new RSVPs, and a capacity-alert pushes to staff. You can override individual entries from the daydash.",
  },
  {
    q: "Wi-Fi died at the door.",
    a: "On mobile, every scan goes into an offline queue. The bouncer keeps scanning; the line keeps moving. When network returns the queue drains automatically. Web scanner does the same via localStorage.",
  },
  {
    q: "How do guests get their QR?",
    a: "Phone OTP confirms identity → SMS arrives with a /t/[token] link → the page renders a high-contrast QR. Add to Apple Wallet / Google Wallet works once the operator wires the cert. Email magic-link is a fallback if Twilio is down.",
  },
  {
    q: "Can I run two events on the same night?",
    a: "Yes — each is a separate event with its own door, its own scanner context, and its own staff invites. The owner dashboard groups by night so you can see both at once.",
  },
];

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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-4)",
          }}
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
        <nav
          style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-6)" }}
        >
          {[
            ["Pricing", "/pricing"],
            ["Tonight", "/discover"],
            ["Embed widget", "/docs/embed"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
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

export default async function HelpPage() {
  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PublicHeader />
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "var(--s-12) var(--s-6) var(--s-16)",
        }}
      >
        <header style={{ marginBottom: "var(--s-10)" }}>
          <div className="t-meta">Help</div>
          <h1 className="t-display-lg" style={{ marginTop: "var(--s-3)" }}>
            Stuck at the door?
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-4)", maxWidth: 640 }}
          >
            Eight things that fix 90% of door problems. Anything else, the
            founder reads every email — see Contact below.
          </p>
        </header>

        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
            marginBottom: "var(--s-14)",
          }}
        >
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="card"
              style={{ padding: "var(--s-5)", cursor: "pointer" }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "var(--s-4)",
                  listStyle: "none",
                }}
              >
                <span className="t-h2" style={{ paddingRight: "var(--s-2)" }}>
                  {f.q}
                </span>
                <span
                  className="t-display-sm"
                  style={{ color: "var(--fg-3)", flexShrink: 0 }}
                >
                  +
                </span>
              </summary>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                {f.a}
              </p>
            </details>
          ))}
        </section>

        <section
          className="card"
          style={{
            padding: "var(--s-6)",
            textAlign: "center",
            borderColor: "var(--line-3)",
          }}
        >
          <div className="t-meta">Still stuck</div>
          <h2 className="t-display-sm" style={{ marginTop: "var(--s-2)" }}>
            Email the founder.
          </h2>
          <p
            className="t-body-2"
            style={{
              marginTop: "var(--s-2)",
              maxWidth: 420,
              marginInline: "auto",
            }}
          >
            Jordy reads every message. Reply usually within an hour during a
            real night, same day otherwise.
          </p>
          <Link
            href="/contact"
            className="btn"
            style={{
              marginTop: "var(--s-5)",
              textDecoration: "none",
            }}
          >
            Contact →
          </Link>
        </section>
      </div>
      <PublicFooter />
    </main>
  );
}
