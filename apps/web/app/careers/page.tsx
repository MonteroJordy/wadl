import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Careers — WADL",
  description: "Work on WADL. Small team. Quiet office. Loud nights.",
};

interface Role {
  title: string;
  location: string;
  type: string;
  href: string;
}

const ROLES: Role[] = [
  {
    title: "Senior Engineer · full-stack",
    location: "Miami or remote",
    type: "Full-time",
    href: "mailto:jobs@wadl.app?subject=Senior%20Engineer%20application",
  },
  {
    title: "Designer · product",
    location: "Miami",
    type: "Full-time",
    href: "mailto:jobs@wadl.app?subject=Designer%20application",
  },
  {
    title: "Account exec",
    location: "Miami · NYC",
    type: "Full-time",
    href: "mailto:jobs@wadl.app?subject=Account%20Exec%20application",
  },
];

export default function CareersPage() {
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
          background:
            "radial-gradient(circle at 10% 10%, rgba(255,61,110,0.05) 0%, transparent 45%), var(--bg)",
          padding: "var(--s-12)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Careers</div>
        <h1
          className="t-display-lg"
          style={{ marginTop: "var(--s-3)" }}
        >
          Work on WADL
        </h1>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-2)",
            maxWidth: 540,
            color: "var(--fg-2)",
          }}
        >
          Small team. Quiet office. Loud nights. We build the tool we wanted at
          the door — and so does everyone we hire.
        </p>

        <div style={{ marginTop: "var(--s-10)" }}>
          <div className="card">
            {ROLES.map((r, i) => (
              <a
                key={r.title}
                href={r.href}
                className="row"
                style={{
                  gridTemplateColumns: "1fr 1fr 120px",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "inherit",
                  borderBottom:
                    i === ROLES.length - 1 ? "0" : "1px solid var(--line)",
                }}
              >
                <span className="t-h1 truncate">{r.title}</span>
                <span className="t-body-2">{r.location}</span>
                <span className="chip" style={{ justifySelf: "start" }}>
                  {r.type}
                </span>
              </a>
            ))}
          </div>
        </div>

        <p
          className="t-meta"
          style={{ marginTop: "var(--s-10)", color: "var(--fg-3)" }}
        >
          Don&apos;t see a fit? Email{" "}
          <a href="mailto:jobs@wadl.app" style={{ color: "var(--fg)" }}>
            jobs@wadl.app
          </a>{" "}
          with what you&apos;re great at.
        </p>
      </main>
      <MarketingFooter />
    </>
  );
}
