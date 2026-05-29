import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = { title: "Sign in — WADL" };

interface PageProps {
  searchParams: { phone?: string; next?: string };
}

export default function RecognizedSignIn({ searchParams }: PageProps) {
  const phone = searchParams.phone ?? "";
  const next = searchParams.next ?? "/mytickets";
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: "var(--s-5)" }}>
        <Logo size={20} />
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-5)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <span className="chip">Already have an account</span>
          <h1
            className="t-display-sm"
            style={{ marginTop: "var(--s-3)", lineHeight: 1.15 }}
          >
            Sign in to continue
          </h1>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
          >
            Your RSVP will be pre-filled when you come back — no progress
            lost.
          </p>
        </div>

        <input className="input" defaultValue={phone} disabled />

        <Link
          href={`/login?phone=${encodeURIComponent(phone)}&next=${encodeURIComponent(next)}`}
          className="btn btn--lg btn--accent btn--block"
          style={{ textDecoration: "none" }}
        >
          Text me a code
        </Link>
        <Link
          href={next}
          className="btn btn--ghost btn--block"
          style={{ textDecoration: "none" }}
        >
          RSVP as guest instead
        </Link>
      </div>
    </main>
  );
}
