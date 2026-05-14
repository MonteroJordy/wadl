import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Contact — WADL",
  description:
    "Reach the founder of WADL. Reply usually within an hour during a real night.",
};

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
            ["Terms", "/terms"],
            ["Help", "/help"],
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

export default async function ContactPage() {
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
        <header style={{ marginBottom: "var(--s-12)" }}>
          <div className="t-meta">Contact</div>
          <h1 className="t-display-lg" style={{ marginTop: "var(--s-3)" }}>
            One person reads every message.
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-4)", maxWidth: 640 }}
          >
            That person is Jordy. He runs nights in Miami and built WADL because
            he was tired of the WhatsApp door. If you&apos;re working a real
            night and something&apos;s broken, reply usually lands within an
            hour — same day otherwise.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--s-3)",
            marginBottom: "var(--s-8)",
          }}
        >
          <a
            href="mailto:jmontero@mainframeagency.com"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="card card--hover"
              style={{ padding: "var(--s-6)" }}
            >
              <div className="t-meta">Email</div>
              <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
                jmontero@mainframeagency.com
              </div>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                Best for ops issues, billing, real-night fires.
              </p>
            </div>
          </a>
          <a
            href="sms:+13057990518"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="card card--hover"
              style={{ padding: "var(--s-6)" }}
            >
              <div className="t-meta">SMS</div>
              <div
                className="t-h1 t-num"
                style={{
                  marginTop: "var(--s-2)",
                  fontFamily: "var(--mono)",
                }}
              >
                (305) 799 0518
              </div>
              <p
                className="t-body-2"
                style={{ marginTop: "var(--s-3)" }}
              >
                Text only. For during-the-night urgencies.
              </p>
            </div>
          </a>
        </div>

        <section
          className="card"
          style={{ padding: "var(--s-6)", marginBottom: "var(--s-6)" }}
        >
          <div className="t-meta">Before you write</div>
          <ul
            style={{
              marginTop: "var(--s-3)",
              listStyle: "none",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {[
              <>
                If the door is down, send a screenshot or the event ID (URL
                after{" "}
                <code style={{ color: "var(--fg)" }}>/owner/events/</code>).
              </>,
              <>
                If a single guest&apos;s scan failed, include their phone or
                check_in_token.
              </>,
              <>For billing, include the email on your account.</>,
              <>
                For feature requests, include what venue / brand / role
                you&apos;re writing from. Helps prioritize.
              </>,
            ].map((li, i) => (
              <li
                key={i}
                className="t-body-2"
                style={{ display: "flex", gap: "var(--s-2)" }}
              >
                <span style={{ color: "var(--fg-4)" }}>·</span>
                <span>{li}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="card"
          style={{ padding: "var(--s-6)", textAlign: "center" }}
        >
          <div className="t-meta">Looking for self-serve</div>
          <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
            The 8 most common door issues are answered on the help page.
          </p>
          <Link
            href="/help"
            className="btn btn--ghost"
            style={{ marginTop: "var(--s-4)", textDecoration: "none" }}
          >
            Read help →
          </Link>
        </section>
      </div>
      <PublicFooter />
    </main>
  );
}
