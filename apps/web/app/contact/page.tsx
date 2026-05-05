import PublicShell from "@/components/public-shell";
import MarketingFooter from "@/components/marketing-footer";

export const metadata = {
  title: "Contact — WADL",
  description:
    "Reach the founder of WADL. Reply usually within an hour during a real night.",
};

export default async function ContactPage() {
  return (
    <>
      <PublicShell maxWidth="4xl" ambient>
        <header style={{ marginBottom: 48 }}>
          <div className="w-type-meta">CONTACT</div>
          <h1
            className="w-type-display-lg"
            style={{ marginTop: 12, lineHeight: 0.94 }}
          >
            One person
            <br />
            reads every message.
          </h1>
          <p
            className="w-type-body"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
              maxWidth: 640,
            }}
          >
            That person is Jordy. He runs nights in Miami and built WADL
            because he was tired of the WhatsApp door. If you&apos;re working
            a real night and something&apos;s broken, reply usually lands
            within an hour — same day otherwise.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <a
            href="mailto:jmontero@mainframeagency.com"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="w-card" style={{ padding: 22 }}>
              <div className="w-type-meta" style={{ color: "var(--w-acc)" }}>
                EMAIL
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 17,
                  marginTop: 8,
                }}
              >
                jmontero@mainframeagency.com
              </div>
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-fg-muted)", marginTop: 10 }}
              >
                Best for ops issues, billing, real-night fires.
              </p>
            </div>
          </a>
          <a
            href="sms:+13057990518"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="w-card" style={{ padding: 22 }}>
              <div className="w-type-meta" style={{ color: "var(--w-acc)" }}>
                SMS
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 17,
                  marginTop: 8,
                  fontFamily: "var(--w-mono)",
                }}
              >
                (305) 799 0518
              </div>
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-fg-muted)", marginTop: 10 }}
              >
                Text only. For during-the-night urgencies.
              </p>
            </div>
          </a>
        </div>

        <section
          className="w-card"
          style={{ padding: 22, marginBottom: 24 }}
        >
          <div className="w-type-meta">BEFORE YOU WRITE</div>
          <ul
            style={{
              marginTop: 12,
              listStyle: "none",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--w-fg-muted)",
            }}
          >
            <li>
              · If the door is down, send a screenshot or the event ID (URL
              after{" "}
              <code style={{ color: "var(--w-acc)" }}>/owner/events/</code>).
            </li>
            <li>
              · If a single guest&apos;s scan failed, include their phone or
              check_in_token.
            </li>
            <li>· For billing, include the email on your account.</li>
            <li>
              · For feature requests, include what venue / brand / role
              you&apos;re writing from. Helps prioritize.
            </li>
          </ul>
        </section>

        <section
          className="w-card"
          style={{ padding: 22, textAlign: "center" }}
        >
          <div className="w-type-meta">LOOKING FOR SELF-SERVE</div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            The 8 most common door issues are answered on the help page.
          </p>
          <a
            href="/help"
            className="w-btn w-btn--ghost"
            style={{
              marginTop: 16,
              display: "inline-flex",
              textDecoration: "none",
            }}
          >
            Read help →
          </a>
        </section>
      </PublicShell>
      <MarketingFooter />
    </>
  );
}
