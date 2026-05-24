import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Lost your phone? — WADL",
  description:
    "Reissue your WADL credential to a new device. Old QR expires immediately.",
};

interface Method {
  title: string;
  desc: string;
  href: string;
  cta: string;
}

const METHODS: Method[] = [
  {
    title: "Verify by SMS",
    desc: "We text a magic code to your number on file.",
    cta: "Send code",
    href: "/login",
  },
  {
    title: "Verify by email",
    desc: "We send a magic link to the email on file.",
    cta: "Send link",
    href: "/login",
  },
  {
    title: "Photo check",
    desc: "Match a selfie against the photo your venue verified at the door.",
    cta: "Email support",
    href: "mailto:hello@wadl.app?subject=Reissue · photo check",
  },
];

export default function ReissuePage() {
  return (
    <>
      <header
        style={{
          padding: "var(--s-4) var(--s-6)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
      </header>

      <main
        id="main-content"
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: "var(--s-12)",
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Recovery</div>
        <h1
          className="t-display-md"
          style={{ marginTop: "var(--s-3)" }}
        >
          Lost your phone?
        </h1>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-2)",
            color: "var(--fg-2)",
            lineHeight: 1.5,
          }}
        >
          We&apos;ll reissue your credential to a new device. The old QR
          expires immediately — anyone with a screenshot of it gets bounced
          at the door.
        </p>

        <div
          style={{
            marginTop: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          {METHODS.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="card card--hover"
              style={{
                padding: "var(--s-5)",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--s-4)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="t-h2">{m.title}</div>
                <div
                  className="t-meta"
                  style={{ marginTop: "var(--s-1)", color: "var(--fg-2)" }}
                >
                  {m.desc}
                </div>
              </div>
              <span
                className="t-meta"
                style={{ color: "var(--fg-3)", flexShrink: 0 }}
              >
                {m.cta} →
              </span>
            </Link>
          ))}
        </div>

        <p
          className="t-meta"
          style={{ marginTop: "var(--s-10)", color: "var(--fg-3)" }}
        >
          Stuck? Email{" "}
          <a href="mailto:hello@wadl.app" style={{ color: "var(--fg)" }}>
            hello@wadl.app
          </a>{" "}
          — we reply within 4h on event nights.
        </p>
      </main>
      <MarketingFooter />
    </>
  );
}
