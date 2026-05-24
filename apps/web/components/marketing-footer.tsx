import Link from "next/link";
import { Logo } from "@/components/v5";

const LINKS: Array<[string, string]> = [
  ["Pricing", "/pricing"],
  ["Tonight", "/discover"],
  ["Changelog", "/changelog"],
  ["Status", "/status"],
  ["Press", "/press"],
  ["Careers", "/careers"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

export default function MarketingFooter() {
  return (
    <footer
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--line)",
        padding: "var(--s-10) var(--s-6)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "var(--s-6)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <Logo size={24} />
          <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
            ONE DOOR · ONE LIST · ONE TRUTH
          </div>
          <div
            className="t-meta"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-3)" }}
          >
            © {new Date().getFullYear()} WADL · BUILT IN MIAMI
          </div>
        </div>
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--s-6)",
          }}
        >
          {LINKS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="t-meta"
              style={{ textDecoration: "none", color: "var(--fg-2)" }}
            >
              {label.toUpperCase()}
            </Link>
          ))}
          <a
            href="mailto:jmontero@mainframeagency.com"
            className="t-meta"
            style={{ textDecoration: "none", color: "var(--fg-2)" }}
          >
            CONTACT
          </a>
        </nav>
      </div>
    </footer>
  );
}
