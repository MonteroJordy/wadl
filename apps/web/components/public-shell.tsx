import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/wadl";

interface Props {
  children: React.ReactNode;
  /** Optional left-aligned context label or back link rendered next to the wordmark. */
  leftSlot?: React.ReactNode;
  /** Optional right-aligned actions (defaults to Sign in + Discover). */
  rightSlot?: React.ReactNode;
  /** Container max-width. Defaults to 6xl. */
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
  /** When true, render the body with a soft brand backdrop on desktop. */
  ambient?: boolean;
}

const MAX_W: Record<NonNullable<Props["maxWidth"]>, string> = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export default async function PublicShell({
  children,
  leftSlot,
  rightSlot,
  maxWidth = "6xl",
  ambient = false,
}: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  return (
    <main
      id="main-content"
      className={`w-app min-h-screen relative ${ambient ? "wadl-ambient" : ""}`}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backdropFilter: "blur(12px)",
          background: "rgba(15,15,16,0.78)",
          borderBottom: "1px solid var(--w-line)",
        }}
      >
        <div
          className={`${MAX_W[maxWidth]} mx-auto`}
          style={{
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
            }}
          >
            <Link href="/" aria-label="WADL home" style={{ textDecoration: "none", flexShrink: 0 }}>
              <Wordmark variant="monogrid" size={20} />
            </Link>
            {leftSlot && (
              <div
                style={{
                  display: "none",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 0,
                }}
                className="md:flex"
              >
                <span style={{ color: "var(--w-line-2)" }}>·</span>
                {leftSlot}
              </div>
            )}
          </div>
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            {rightSlot ? (
              rightSlot
            ) : (
              <>
                <Link
                  href="/discover"
                  className="w-type-meta hidden sm:inline"
                  style={{ textDecoration: "none" }}
                >
                  TONIGHT
                </Link>
                {authed ? (
                  <Link
                    href="/mytickets"
                    className="w-btn w-btn--ghost"
                    style={{
                      height: 36,
                      padding: "0 14px",
                      fontSize: 12,
                      textDecoration: "none",
                    }}
                  >
                    My tickets
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="w-btn w-btn--ghost"
                    style={{
                      height: 36,
                      padding: "0 14px",
                      fontSize: 12,
                      textDecoration: "none",
                    }}
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <div
        className={`${MAX_W[maxWidth]} mx-auto`}
        style={{ padding: "24px 24px 64px" }}
      >
        {children}
      </div>

      <style>{`
        .wadl-ambient {
          background-image:
            radial-gradient(ellipse 800px 600px at 50% -200px, oklch(0.7 0.24 260 / 0.08), transparent 70%),
            radial-gradient(ellipse 600px 500px at 50% 110%, oklch(0.7 0.24 260 / 0.04), transparent 70%);
          background-attachment: fixed;
        }
      `}</style>
    </main>
  );
}
