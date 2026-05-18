import Link from "next/link";
import { Logo } from "@/components/v5";

export const metadata = { title: "Save your pass — WADL" };

interface PageProps {
  params: { token: string };
  searchParams: { g?: string };
}

export default function GuestlessUpgrade({ params, searchParams }: PageProps) {
  const guestToken = searchParams.g ?? "";
  // The upgrade landing is intentionally lightweight — it points the
  // guest at the existing /signup magic-link flow with a return URL so
  // the existing auth-callback can link their phone to the new account.
  const next = `/g/${params.token}/pass?g=${guestToken}`;
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
      <header
        style={{
          padding: "var(--s-4) var(--s-5)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Logo size={20} />
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <div className="t-meta">OPTIONAL</div>
          <h1
            className="t-display-md"
            style={{ marginTop: "var(--s-2)", lineHeight: 1.1 }}
          >
            Save your passes
            <br />
            to an account.
          </h1>
          <p
            className="t-body"
            style={{
              marginTop: "var(--s-4)",
              color: "var(--fg-2)",
            }}
          >
            Sign in once with a magic link and every future RSVP shows up in
            one place. We&apos;ll link the pass you just got to your account
            automatically.
          </p>
        </div>

        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="btn btn--lg btn--block"
          style={{ textDecoration: "none" }}
        >
          Sign in with magic link
        </Link>

        <Link
          href={next}
          className="t-meta"
          style={{
            textAlign: "center",
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          NOT NOW · BACK TO MY PASS
        </Link>
      </div>
    </main>
  );
}
