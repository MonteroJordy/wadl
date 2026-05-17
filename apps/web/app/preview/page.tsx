import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview · WADL" };

/**
 * Preview-mode dispatcher. One click per role → real Supabase session
 * for a seeded demo account → drops you into that role's actual UI.
 *
 * Env-gated: NEXT_PUBLIC_PREVIEW_MODE === "1" or the page 404s. On
 * Vercel, set this on the preview / staging environments only. Pair
 * with the 20260513000001_demo_accounts.sql migration which seeds the
 * 4 demo users + their sample event/allocation/RSVP rows.
 */

interface RoleCard {
  role: "owner" | "holder" | "staff" | "guest";
  title: string;
  who: string;
  preview: string;
  tone: "acc" | "mint" | "warn" | "coral";
}

const ROLES: RoleCard[] = [
  {
    role: "owner",
    title: "Operator",
    who: "Demo Owner @ Demo Venue",
    preview:
      "Run the door, build the list, see scorecards. The full operator console.",
    tone: "acc",
  },
  {
    role: "holder",
    title: "Promoter",
    who: "Demo Promoter (claimed allocation)",
    preview:
      "Their magic link — add names up to their cap, see who scanned in.",
    tone: "mint",
  },
  {
    role: "staff",
    title: "Door staff",
    who: "Demo Door Staff (event-scoped)",
    preview:
      "The scanner UI. QR camera, manual search, override admit, walk-up.",
    tone: "warn",
  },
  {
    role: "guest",
    title: "Guest",
    who: "Demo Guest (RSVP'd, approved)",
    preview:
      "Their wallet — credential QR, event details, transfer, cancel, plus-ones.",
    tone: "coral",
  },
];

const TONE_BORDER: Record<RoleCard["tone"], string> = {
  acc: "var(--w-acc)",
  mint: "var(--w-ok)",
  warn: "var(--w-warn)",
  coral: "var(--w-err)",
};
const TONE_COLOR: Record<RoleCard["tone"], string> = {
  acc: "var(--w-acc)",
  mint: "var(--w-ok)",
  warn: "var(--w-warn)",
  coral: "var(--w-err)",
};

export default function PreviewPage() {
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE !== "1") {
    notFound();
  }

  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <Logo size={20} />
          <Link
            href="/"
            className="w-type-meta"
            style={{ textDecoration: "none", color: "var(--w-fg-muted)" }}
          >
            ← MARKETING SITE
          </Link>
        </div>

        <div className="w-type-meta" style={{ color: "var(--w-warn)" }}>
          PREVIEW MODE · NOT PRODUCTION
        </div>
        <div className="w-type-display-md" style={{ marginTop: 8 }}>
          See WADL through every role&apos;s eyes.
        </div>
        <p
          className="w-type-body-sm"
          style={{
            color: "var(--w-fg-muted)",
            marginTop: 12,
            maxWidth: 600,
            lineHeight: 1.5,
          }}
        >
          Click a card to sign in as that demo user. Real Supabase session,
          real UI, real data on a sandbox event. No password, no OTP —
          intended for design review and stakeholder walkthroughs.
        </p>

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {ROLES.map((r) => (
            <a
              key={r.role}
              href={`/api/preview/login?role=${r.role}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="w-card"
                style={{
                  padding: 20,
                  border: `1px solid ${TONE_BORDER[r.tone]}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  height: "100%",
                  transition: "transform 0.12s, background 0.12s",
                }}
              >
                <div
                  className="w-type-meta"
                  style={{ color: TONE_COLOR[r.tone] }}
                >
                  SIGN IN AS
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 24,
                    letterSpacing: "-0.02em",
                    color: TONE_COLOR[r.tone],
                  }}
                >
                  {r.title}
                </div>
                <div
                  className="w-type-meta"
                  style={{ color: "var(--w-fg-muted)" }}
                >
                  {r.who}
                </div>
                <p
                  className="w-type-body-sm"
                  style={{
                    color: "var(--w-fg)",
                    lineHeight: 1.5,
                    marginTop: 4,
                  }}
                >
                  {r.preview}
                </p>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{
                      borderColor: TONE_BORDER[r.tone],
                      color: TONE_COLOR[r.tone],
                    }}
                  >
                    Enter →
                  </button>
                </div>
              </div>
            </a>
          ))}
        </div>

        <details
          style={{
            marginTop: 48,
            padding: 16,
            border: "1px dashed var(--w-line)",
          }}
        >
          <summary
            className="w-type-meta"
            style={{ cursor: "pointer", color: "var(--w-fg-muted)" }}
          >
            HOW THIS WORKS
          </summary>
          <ul
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 12,
              paddingLeft: 20,
              lineHeight: 1.6,
            }}
          >
            <li>
              Each card POSTs to{" "}
              <code style={{ fontFamily: "var(--w-mono)" }}>
                /api/preview/login?role=&hellip;
              </code>
            </li>
            <li>
              The server uses Supabase admin{" "}
              <code style={{ fontFamily: "var(--w-mono)" }}>
                generateLink()
              </code>{" "}
              to mint a magic-link URL for the demo user
            </li>
            <li>
              Browser redirects to the magic-link; Supabase sets the session
              cookie and lands you on the role&apos;s home page
            </li>
            <li>
              Demo users + data are seeded by{" "}
              <code style={{ fontFamily: "var(--w-mono)" }}>
                supabase/migrations/20260513000001_demo_accounts.sql
              </code>
            </li>
            <li>
              This page 404s in production —{" "}
              <code style={{ fontFamily: "var(--w-mono)" }}>
                NEXT_PUBLIC_PREVIEW_MODE
              </code>{" "}
              must be{" "}
              <code style={{ fontFamily: "var(--w-mono)" }}>1</code>
            </li>
          </ul>
        </details>
      </div>
    </main>
  );
}
