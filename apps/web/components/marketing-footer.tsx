import Link from "next/link";
import { Wordmark } from "@/components/wadl";

export default function MarketingFooter() {
  return (
    <footer
      style={{
        background: "var(--w-bg)",
        borderTop: "1px solid var(--w-line)",
        padding: "40px 24px",
      }}
    >
      <div
        className="max-w-6xl mx-auto"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Wordmark variant="monogrid" size={24} />
            <div className="w-type-meta" style={{ marginTop: 12 }}>
              ONE DOOR · ONE LIST · ONE TRUTH
            </div>
            <div
              className="w-type-meta"
              style={{ marginTop: 8, color: "var(--w-fg-dim)" }}
            >
              © {new Date().getFullYear()} WADL · BUILT IN MIAMI
            </div>
          </div>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            {[
              ["Pricing", "/pricing"],
              ["Tonight", "/discover"],
              ["Embed widget", "/docs/embed"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="w-type-meta"
                style={{ textDecoration: "none" }}
              >
                {label.toUpperCase()}
              </Link>
            ))}
            <a
              href="mailto:jmontero@mainframeagency.com"
              className="w-type-meta"
              style={{ textDecoration: "none" }}
            >
              CONTACT
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
