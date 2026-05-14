import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import MarketingFooter from "@/components/marketing-footer";
import { Cover, CoverHeader } from "@/components/v5";
import {
  Avatar,
  IconArrow,
  Wordmark,
} from "@/components/wadl";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "WADL — Replace the WhatsApp door.",
  description:
    "Google Sheets, group chats, names yelled across the door at midnight. WADL turns nightlife guest lists into one attributed list every venue trusts.",
  openGraph: {
    title: "WADL — Replace the WhatsApp door.",
    description:
      "Google Sheets, group chats, names at the door at midnight. WADL is one list every venue trusts.",
    images: ["/api/og/landing"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/landing"],
  },
};

export default async function RootPage() {
  // Auth-aware nav, no forced redirect. Logged-in operators can browse the
  // marketing surface; the nav swaps Sign-in/Start-free for a Dashboard CTA.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();
    profile = data;
  }

  const dashboardHref =
    profile?.role === "guest"
      ? "/mytickets"
      : profile?.account_id
        ? "/owner"
        : "/signup"; // incomplete onboarding — wizard picks up where they left off

  const initials =
    (profile?.full_name ?? "")
      .split(" ")
      .map((s) => s[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    (user?.email ?? user?.phone ?? "??").slice(0, 2).toUpperCase();

  return (
    <>
      <main
        id="main-content"
        className="w-app"
        style={{ minHeight: "100vh", background: "var(--w-bg)" }}
      >
        {/* Top nav — auth-aware */}
        <header
          style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 1200,
            margin: "0 auto",
            gap: 12,
          }}
        >
          <Link href="/" aria-label="WADL home" style={{ textDecoration: "none" }}>
            <Wordmark variant="monogrid" size={22} />
          </Link>
          <nav
            style={{ display: "flex", alignItems: "center", gap: 18 }}
          >
            <Link
              href="/pricing"
              className="w-type-meta hidden sm:inline"
              style={{ textDecoration: "none" }}
            >
              PRICING
            </Link>
            <Link
              href="/discover"
              className="w-type-meta hidden sm:inline"
              style={{ textDecoration: "none" }}
            >
              TONIGHT
            </Link>
            {user ? (
              <Link
                href={dashboardHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 36,
                  padding: "0 14px",
                  background: "var(--w-acc)",
                  color: "var(--w-acc-ink)",
                  fontFamily: "var(--w-sans)",
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: "none",
                  letterSpacing: "-0.005em",
                }}
              >
                <Avatar name={initials} size={20} />
                Dashboard
                <IconArrow size={12} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-type-meta"
                  style={{ textDecoration: "none" }}
                >
                  SIGN IN
                </Link>
                <Link
                  href="/signup"
                  className="w-btn w-btn--primary"
                  style={{
                    height: 36,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Start free
                </Link>
              </>
            )}
          </nav>
        </header>

        {/* Hero — v5 CoverHeader composition: full-bleed procedural
            cover, eyebrow + display-lg title bottom-aligned, actions
            inline. Matches Wadl v5.html → V5Marketing exactly. */}
        <CoverHeader
          seed="Replace the WhatsApp door"
          height={560}
          eyebrow="■ BUILT WITH MIAMI OPERATORS"
          title={
            <>
              Replace the
              <br />
              WhatsApp door.
            </>
          }
          actions={
            <>
              {user ? (
                <Link
                  href={dashboardHref}
                  className="btn btn--xl"
                  style={{ textDecoration: "none" }}
                >
                  Open dashboard →
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="btn btn--xl"
                  style={{ textDecoration: "none" }}
                >
                  Start free — 4 min →
                </Link>
              )}
              <Link
                href="/pricing"
                className="btn btn--ghost btn--xl"
                style={{ textDecoration: "none" }}
              >
                See pricing
              </Link>
            </>
          }
        />
        {/* Intro line under hero */}
        <section
          style={{
            padding: "var(--s-8) var(--s-8) var(--s-4)",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <p
            className="t-body"
            style={{
              color: "var(--fg-2)",
              fontSize: 18,
              lineHeight: 1.5,
              maxWidth: 680,
            }}
          >
            Google Sheets. Group chats. Names yelled across the door at
            midnight. WADL turns nightlife guest lists into one attributed
            list every venue trusts — and the data nobody else has on their
            promoters.
          </p>
        </section>

        {/* Tonight, somewhere — 3-card grid (V5Marketing) */}
        <section
          style={{
            padding: "var(--s-4) var(--s-8) var(--s-12)",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Tonight, somewhere
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--s-4)",
            }}
          >
            {[
              {
                seed: "Donato Dozzy",
                when: "Fri · BR · BK · 22",
                name: "Donato Dozzy",
                chip: "ok" as const,
                status: "VIP open",
              },
              {
                seed: "House Brand · 04",
                when: "Sat · Output · 23",
                name: "House Brand · 04",
                chip: "warn" as const,
                status: "Waitlist",
              },
              {
                seed: "Bossa Nova jam",
                when: "Sun · Bossa Nova · 22:30",
                name: "Bossa Nova jam",
                chip: "ok" as const,
                status: "GA open",
              },
            ].map((ev) => (
              <Link
                key={ev.seed}
                href="/discover"
                className="card card--hover"
                style={{ textDecoration: "none" }}
              >
                <Cover seed={ev.seed} height={200}>
                  <div
                    style={{
                      position: "absolute",
                      left: "var(--s-4)",
                      right: "var(--s-4)",
                      bottom: "var(--s-4)",
                    }}
                  >
                    <div
                      className="t-meta"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {ev.when}
                    </div>
                    <div
                      className="t-h1"
                      style={{ marginTop: "var(--s-1)", color: "#fff" }}
                    >
                      {ev.name}
                    </div>
                  </div>
                </Cover>
                <div
                  style={{
                    padding: "var(--s-4)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span className={"chip chip--" + ev.chip}>{ev.status}</span>
                  <span className="btn btn--sm">RSVP</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* The pain */}
        <section
          style={{
            padding: "var(--s-16) var(--s-8)",
            background: "var(--bg-2)",
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="t-meta">The night before</div>
            <h2
              className="t-display-md"
              style={{ marginTop: "var(--s-3)", maxWidth: 720 }}
            >
              Right now your guest list lives in three Google Sheets and a
              WhatsApp.
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--s-4)",
                marginTop: "var(--s-10)",
              }}
            >
              {[
                {
                  k: "01",
                  t: "Names dumped into chats",
                  d: "Promoters paste names with no tier labels. Mid-event adds arrive in a group chat with 47 people scrolling past.",
                },
                {
                  k: "02",
                  t: "Door staff copy-paste",
                  d: "A bouncer with a Google Sheet open on a laptop. New names get typed in by hand. The line stops moving.",
                },
                {
                  k: "03",
                  t: "Nobody owns the truth",
                  d: "When a name isn't on the list, it's a fight at the door. When promoters take credit they didn't earn, you can't prove it.",
                },
              ].map((p) => (
                <div
                  key={p.k}
                  className="card"
                  style={{ padding: "var(--s-6)" }}
                >
                  <div className="t-meta">{p.k}</div>
                  <h3 className="t-h1" style={{ marginTop: "var(--s-3)" }}>
                    {p.t}
                  </h3>
                  <p
                    className="t-body-2"
                    style={{ marginTop: "var(--s-2)" }}
                  >
                    {p.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What WADL does */}
        <section
          style={{
            padding: "var(--s-20) var(--s-8)",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div className="t-meta">What you get</div>
          <h2
            className="t-display-md"
            style={{ marginTop: "var(--s-3)", maxWidth: 800 }}
          >
            One link per tier. One scan at the door. One score per promoter.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--s-4)",
              marginTop: "var(--s-10)",
            }}
          >
            <div
              className="card"
              style={{
                padding: "var(--s-6)",
                borderColor: "var(--fg)",
              }}
            >
              <div className="t-meta">The wedge</div>
              <h3 className="t-h1" style={{ marginTop: "var(--s-3)" }}>
                Sub-links per tier
              </h3>
              <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
                Diplo&apos;s 25-spot list = 5 AAA · 10 VIP · 10 GA. Three
                links, three audiences. AAA in his Signal group, VIP in his
                inner circle, GA in his Instagram bio.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "var(--s-2)",
                  marginTop: "var(--s-4)",
                }}
              >
                <span className="chip">GA</span>
                <span className="chip">VIP</span>
                <span className="chip">AAA</span>
              </div>
            </div>

            <div className="card" style={{ padding: "var(--s-6)" }}>
              <div className="t-meta">02</div>
              <h3 className="t-h1" style={{ marginTop: "var(--s-3)" }}>
                Magic-link holders
              </h3>
              <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
                Send a holder a link. They add names, set caps, approve.
                No app, no account, no password reset at midnight.
              </p>
            </div>

            <div className="card" style={{ padding: "var(--s-6)" }}>
              <div className="t-meta">03</div>
              <h3 className="t-h1" style={{ marginTop: "var(--s-3)" }}>
                Door scanner + manual
              </h3>
              <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
                QR scan with five fail states. Tap-to-search by name when the
                phone won&apos;t scan. Works offline; sync when reception
                returns.
              </p>
            </div>

            <div className="card" style={{ padding: "var(--s-6)" }}>
              <div className="t-meta">04</div>
              <h3 className="t-h1" style={{ marginTop: "var(--s-3)" }}>
                Per-tier promoter scoring
              </h3>
              <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
                AAA at 100% check-in but GA at 40%? Cap his GA at 5 next
                event. The data nobody else has.
              </p>
            </div>
          </div>
        </section>

        {/* Co-host strip */}
        <section
          style={{
            padding: "var(--s-16) var(--s-8)",
            background: "var(--bg-2)",
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="t-meta">Venue × brand</div>
            <h2
              className="t-display-md"
              style={{ marginTop: "var(--s-3)", maxWidth: 720 }}
            >
              When a brand brings a show into your room, you both own the
              door.
            </h2>
            <p
              className="t-body-2"
              style={{ marginTop: "var(--s-4)", maxWidth: 640 }}
            >
              Equal capabilities. The brand invites the venue (or vice versa)
              by handle, email, or phone. If they&apos;re not on WADL yet,
              the invite spins them up an account.
            </p>
          </div>
        </section>

        {/* Founder note */}
        <section
          style={{
            padding: "var(--s-20) var(--s-8)",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <div className="t-meta">A note from the founder</div>
          <h2 className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
            I work the door too.
          </h2>
          <div
            style={{
              marginTop: "var(--s-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-4)",
            }}
          >
            <p className="t-body">
              I&apos;m Jordy. I run nights in Miami. The list is a Google
              Sheet that becomes three Google Sheets that becomes a WhatsApp
              screenshot at the door. Fights start over names that
              aren&apos;t there. Promoters take credit for arrivals they
              didn&apos;t bring. The line stops moving.
            </p>
            <p className="t-body">
              WADL is the tool I needed. If you run nights, you know exactly
              what I mean.
            </p>
            <p className="t-body" style={{ fontWeight: 500 }}>
              — Jordy
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section
          style={{
            padding: "var(--s-20) var(--s-8) var(--s-24)",
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2 className="t-display-md">Run your next night with WADL.</h2>
          <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
            Free for one venue. No card. Set up in under five minutes.
          </p>
          <div style={{ marginTop: "var(--s-6)" }}>
            {user ? (
              <Link
                href={dashboardHref}
                className="btn btn--lg"
                style={{ textDecoration: "none" }}
              >
                Open dashboard →
              </Link>
            ) : (
              <Link
                href="/signup"
                className="btn btn--lg"
                style={{ textDecoration: "none" }}
              >
                Start free →
              </Link>
            )}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
