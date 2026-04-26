import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Public / anonymous-or-light-auth shell. Every route that isn't behind the
 * AuthedShell uses this — discover, /e/[id], /t/[token], /mytickets, the
 * marketing pages. Pins the WADL wordmark + chrome at the top of every
 * surface so they all feel like the same product.
 *
 * Server component — reads Supabase session to flip Sign in → My tickets when
 * appropriate.
 */
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
      className={`min-h-screen relative ${
        ambient ? "wadl-ambient" : ""
      }`}
    >
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
        <div
          className={`${MAX_W[maxWidth]} mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="font-display text-2xl text-coral tracking-wide shrink-0"
              aria-label="WADL home"
            >
              WADL
            </Link>
            {leftSlot && (
              <div className="hidden md:flex items-center gap-3 min-w-0">
                <span className="text-line">·</span>
                {leftSlot}
              </div>
            )}
          </div>
          <nav className="flex items-center gap-3 md:gap-4">
            {rightSlot ? (
              rightSlot
            ) : (
              <>
                <Link
                  href="/discover"
                  className="label-mono hover:text-cream transition hidden sm:inline"
                >
                  Tonight
                </Link>
                {authed ? (
                  <Link
                    href="/mytickets"
                    className="font-sans font-semibold text-xs uppercase tracking-[0.16em] px-4 py-2 rounded-full bg-s2 border border-line text-cream hover:border-coral transition"
                  >
                    My tickets
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="font-sans font-semibold text-xs uppercase tracking-[0.16em] px-4 py-2 rounded-full bg-s2 border border-line text-cream hover:border-coral transition"
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <div className={`${MAX_W[maxWidth]} mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-16`}>
        {children}
      </div>

      <style>{`
        .wadl-ambient {
          background-image:
            radial-gradient(ellipse 800px 600px at 50% -200px, rgba(255, 74, 43, 0.06), transparent 70%),
            radial-gradient(ellipse 600px 500px at 50% 110%, rgba(245, 200, 66, 0.03), transparent 70%);
          background-attachment: fixed;
        }
      `}</style>
    </main>
  );
}
