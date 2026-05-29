import Link from "next/link";
import MarketingFooter from "@/components/marketing-footer";
import { Logo } from "@/components/v5";

export const metadata = {
  title: "Press kit — WADL",
  description: "For writers covering WADL. Logo files, screenshots, brand voice.",
};

interface Resource {
  title: string;
  desc: string;
  href: string;
}

const RESOURCES: Resource[] = [
  { title: "Logo · light", desc: "SVG · PNG · 2×", href: "mailto:press@wadl.app?subject=Press kit · logo light" },
  { title: "Logo · dark", desc: "SVG · PNG · 2×", href: "mailto:press@wadl.app?subject=Press kit · logo dark" },
  { title: "Screenshots", desc: "Web · mobile · 12 files", href: "mailto:press@wadl.app?subject=Press kit · screenshots" },
  { title: "Brand voice", desc: "How we sound, in 1 page", href: "mailto:press@wadl.app?subject=Press kit · brand voice" },
  { title: "Founder bio", desc: "Jordy Montero · headshot", href: "mailto:press@wadl.app?subject=Press kit · founder bio" },
  { title: "Press contact", desc: "press@wadl.app", href: "mailto:press@wadl.app" },
];

export default function PressPage() {
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
            "radial-gradient(circle at 90% 10%, rgba(255,138,61,0.05) 0%, transparent 45%), var(--bg)",
          padding: "var(--s-12)",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Press</div>
        <h1
          className="t-display-lg"
          style={{ marginTop: "var(--s-3)" }}
        >
          Press kit
        </h1>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-2)",
            maxWidth: 540,
            color: "var(--fg-2)",
          }}
        >
          For writers covering WADL. Logo files, screenshots, brand voice. Each
          link emails press@wadl.app — we&apos;ll send the files within a day.
        </p>

        <div
          style={{
            marginTop: "var(--s-10)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          {RESOURCES.map((r) => (
            <a
              key={r.title}
              href={r.href}
              className="card card--hover"
              style={{
                padding: "var(--s-5)",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div className="t-h1">{r.title}</div>
              <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                {r.desc}
              </div>
            </a>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
