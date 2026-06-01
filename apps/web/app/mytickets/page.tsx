import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtTime } from "@/lib/format";
import { Cover, Logo } from "@/components/v5";
import MyTicketsVerify from "./verify-form";

export const dynamic = "force-dynamic";

const SHELL_STYLE: React.CSSProperties = {
  marginInline: "auto",
  width: "100%",
  maxWidth: 420,
  minHeight: "100vh",
  background: "var(--bg)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

interface TicketRow {
  id: string;
  full_name: string;
  plus_ones: number;
  status: string;
  tier: string;
  tier_upgraded_at: string | null;
  tier_upgrade_seen_at: string | null;
  check_in_token: string;
  created_at: string;
  night: {
    id: string;
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; flyer_url: string | null };
  };
}

function tierLabel(t: string): string {
  return t.replace(/_/g, " ").toUpperCase();
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function fmtCredDate(d: string): string {
  const dt = new Date(d);
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()];
  const mon = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][dt.getMonth()];
  return `${dow} ${String(dt.getDate()).padStart(2, "0")} ${mon}`;
}

export default async function MyTicketsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.phone) {
    return (
      <main id="main-content" className="v5">
        <div style={{ ...SHELL_STYLE, paddingBottom: "var(--s-12)" }}>
          <div
            style={{
              padding: "var(--s-5) var(--s-5) 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Logo size={16} />
            <Link
              href="/discover"
              className="t-meta"
              style={{ textDecoration: "none" }}
            >
              Discover →
            </Link>
          </div>
          <div style={{ padding: "var(--s-8) var(--s-5) 0" }}>
            <div className="t-display-sm">Wallet</div>
            <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              Verify your phone to pull up everything you&apos;ve RSVP&apos;d
              for.
            </div>
          </div>
          <div style={{ padding: "var(--s-6) var(--s-5) 0" }}>
            <MyTicketsVerify />
          </div>
        </div>
      </main>
    );
  }

  const phoneWithPlus = user.phone.startsWith("+")
    ? user.phone
    : `+${user.phone}`;

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, tier, tier_upgraded_at, tier_upgrade_seen_at, check_in_token, created_at, night:event_nights!inner(id, night_date, doors_at, event:events!inner(id, name, flyer_url))",
    )
    .eq("phone", phoneWithPlus)
    .not("check_in_token", "is", null)
    .order("created_at", { ascending: false });

  const rows = (tickets ?? []) as unknown as TicketRow[];

  const newUpgrades = rows.filter(
    (t) => t.tier_upgraded_at && !t.tier_upgrade_seen_at,
  );
  if (newUpgrades.length > 0) {
    const ids = newUpgrades.map((t) => t.id);
    await admin
      .from("guests")
      .update({ tier_upgrade_seen_at: new Date().toISOString() })
      .in("id", ids);
  }

  const now = Date.now();
  const upcoming: TicketRow[] = [];
  const past: TicketRow[] = [];
  for (const t of rows) {
    if (new Date(t.night.doors_at).getTime() >= now - 6 * 60 * 60_000) {
      upcoming.push(t);
    } else {
      past.push(t);
    }
  }

  return (
    <main id="main-content" className="v5">
      <div style={{ ...SHELL_STYLE, paddingBottom: "var(--s-16)" }}>
        {/* Header — Wallet + N live · N past */}
        <div
          style={{
            padding: "var(--s-5) var(--s-5) 0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div className="t-display-sm">Wallet</div>
          <div className="t-meta">
            {upcoming.length} live · {past.length} past
          </div>
        </div>

        {newUpgrades.length > 0 && (
          <div style={{ padding: "var(--s-5) var(--s-5) 0" }}>
            <div
              className="card"
              style={{ padding: "var(--s-4)", borderColor: "var(--fg)" }}
            >
              <span className="chip chip--ok">↑ Tier upgrade</span>
              <div style={{ marginTop: "var(--s-2)" }}>
                {newUpgrades.map((t) => (
                  <div key={t.id} className="t-body-2">
                    Bumped to <strong>{tierLabel(t.tier)}</strong> for{" "}
                    <strong>{t.night.event.name}</strong>.
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div
            style={{
              padding: "var(--s-16) var(--s-5) 0",
              textAlign: "center",
            }}
          >
            <div className="t-h1">Nothing here yet</div>
            <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              RSVP to an event and your ticket will appear here.
            </div>
            <Link
              href="/discover"
              className="btn btn--accent"
              style={{ marginTop: "var(--s-6)" }}
            >
              Browse events
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <TicketSection label={`Live · ${upcoming.length}`}>
                {upcoming.map((t) => (
                  <TicketCard key={t.id} t={t} highlight />
                ))}
              </TicketSection>
            )}
            {past.length > 0 && (
              <TicketSection label={`Past · ${past.length}`}>
                {past.map((t) => (
                  <TicketCard key={t.id} t={t} />
                ))}
              </TicketSection>
            )}
          </>
        )}

        <div
          className="t-meta"
          style={{
            marginTop: "auto",
            paddingTop: "var(--s-8)",
            textAlign: "center",
            color: "var(--fg-4)",
          }}
        >
          <Link
            href="/mytickets/profile"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Profile
          </Link>
          {" · "}
          <form
            action="/api/auth/signout"
            method="post"
            style={{ display: "inline" }}
          >
            <button
              type="submit"
              style={{
                background: "transparent",
                border: 0,
                color: "inherit",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function TicketSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "var(--s-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
      }}
    >
      <div className="t-meta">{label}</div>
      {children}
    </div>
  );
}

function TicketCard({ t, highlight }: { t: TicketRow; highlight?: boolean }) {
  const today = isToday(t.night.doors_at);
  const timeLine = today
    ? `Tonight · doors ${fmtTime(t.night.doors_at)}`
    : `${fmtCredDate(t.night.night_date)} · doors ${fmtTime(t.night.doors_at)}`;
  const partyLabel =
    t.plus_ones > 0
      ? `${tierLabel(t.tier)} · party of ${t.plus_ones + 1}`
      : tierLabel(t.tier);

  return (
    <Link
      href={`/t/${t.check_in_token}`}
      className="card"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        overflow: "hidden",
        ...(highlight
          ? {
              borderColor: "rgba(255,61,110,0.4)",
              boxShadow: "0 8px 32px rgba(255,61,110,0.16)",
            }
          : null),
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: highlight ? "4 / 5" : undefined,
          height: highlight ? undefined : 140,
        }}
      >
        <Cover
          seed={t.night.event.name}
          height={highlight ? undefined : 140}
          style={highlight ? { height: "100%" } : undefined}
        >
          {highlight && today && (
            <span
              className="chip chip--accent"
              style={{
                position: "absolute",
                top: "var(--s-4)",
                left: "var(--s-4)",
                fontSize: 10,
              }}
            >
              TONIGHT
            </span>
          )}
          <div
            style={{
              position: "absolute",
              left: "var(--s-4)",
              right: "var(--s-4)",
              bottom: "var(--s-4)",
            }}
          >
            <div className="t-meta" style={{ color: "rgba(255,255,255,0.7)" }}>
              {timeLine}
            </div>
            <div
              className={highlight ? "t-display-sm" : "t-h1"}
              style={{ color: "#fff", marginTop: "var(--s-1)" }}
            >
              {t.night.event.name}
            </div>
          </div>
        </Cover>
      </div>
      <div
        style={{
          padding: "var(--s-4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="t-h2">{partyLabel}</span>
        <span className={"btn btn--sm " + (highlight ? "btn--accent" : "")}>
          Show QR
        </span>
      </div>
    </Link>
  );
}
