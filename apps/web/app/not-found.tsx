import Link from "next/link";

export const metadata = {
  title: "Not found — WADL",
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          padding: "var(--s-24) var(--s-8)",
          textAlign: "center",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">404</div>
        <div className="t-display-lg" style={{ marginTop: "var(--s-3)" }}>
          Page not found
        </div>
        <div className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          The link is broken or the event was removed.
        </div>
        <Link
          href="/discover"
          className="btn btn--accent"
          style={{ marginTop: "var(--s-6)", textDecoration: "none" }}
        >
          Back to events
        </Link>
      </div>
    </main>
  );
}
