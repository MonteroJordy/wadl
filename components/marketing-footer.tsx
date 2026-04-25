import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="bg-bg border-t border-line px-6 md:px-12 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="font-display text-2xl text-coral tracking-wide mb-2">
            WADL
          </p>
          <p className="label-mono">
            One door, one list, one truth.
          </p>
          <p className="label-mono mt-2 text-muted">
            © {new Date().getFullYear()} WADL. Built in Miami.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/pricing" className="label-mono hover:text-cream">
            Pricing
          </Link>
          <Link href="/discover" className="label-mono hover:text-cream">
            Tonight
          </Link>
          <Link href="/docs/embed" className="label-mono hover:text-cream">
            Embed widget
          </Link>
          <Link href="/privacy" className="label-mono hover:text-cream">
            Privacy
          </Link>
          <Link href="/terms" className="label-mono hover:text-cream">
            Terms
          </Link>
          <a
            href="mailto:jmontero@mainframeagency.com"
            className="label-mono hover:text-cream"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
