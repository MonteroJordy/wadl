import Link from "next/link";
import { Button } from "@/components/wadl";

export const metadata = {
  title: "Not found — WADL",
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          className="w-type-meta"
          style={{ color: "var(--w-fg-muted)", marginBottom: 12 }}
        >
          404 · NOT FOUND
        </div>
        <div className="w-type-display-md" style={{ marginBottom: 12 }}>
          Dead end.
        </div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          That page either moved, never existed, or your link expired.
          The door's still open.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 280,
            marginInline: "auto",
          }}
        >
          <Link href="/owner" style={{ textDecoration: "none" }}>
            <Button variant="primary" block>
              Go to dashboard
            </Button>
          </Link>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="ghost" block>
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
