import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  Avatar,
  Chip,
  CredPill,
  CredentialCard,
  WFrame,
  Wordmark,
} from "@/components/wadl";
import type { Tier } from "@/components/wadl";
import MyTicketsVerify from "./verify-form";

export const dynamic = "force-dynamic";

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

function tierFromString(t: string): Tier {
  const u = t.toUpperCase().replace(/_/g, "");
  if (u.includes("VIP")) return "VIP";
  if (u.includes("ALL") || u === "AAA") return "AAA";
  return "GA";
}

function fmtCredDate(d: string): string {
  const dt = new Date(d);
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dt.getDay()];
  const mon = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
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
      <main id="main-content">
        <WFrame style={{ paddingBottom: 48 }}>
          <div
            style={{
              padding: "20px 20px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Wordmark variant="monogrid" size={16} />
            <Link
              href="/discover"
              className="w-type-meta"
              style={{ textDecoration: "none" }}
            >
              ← DISCOVER
            </Link>
          </div>
          <div style={{ padding: "32px 20px 0" }}>
            <div className="w-type-meta">WALLET</div>
            <div className="w-type-display-md" style={{ marginTop: 6 }}>
              My tickets
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
              }}
            >
              Verify your phone to pull up everything you&apos;ve RSVP&apos;d
              for.
            </p>
          </div>
          <div style={{ padding: "32px 20px 0" }}>
            <MyTicketsVerify />
          </div>
        </WFrame>
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

  // The hero: the next-up credential, with up to two past credentials
  // peeking out behind it as a stack. Matches handoff Wallet().
  const hero = upcoming[0];
  const stackBehind = [...past].slice(0, 2);
  const initials = (user.user_metadata?.full_name as string | undefined)
    ?.split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 96 }}>
        <div
          style={{
            padding: "20px 20px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark variant="monogrid" size={16} />
          <Avatar name={initials || phoneWithPlus.slice(-2)} size={28} />
        </div>

        <div style={{ padding: "24px 20px 0" }}>
          <div className="w-type-meta">
            WALLET · {rows.length} CREDENTIAL{rows.length === 1 ? "" : "S"}
          </div>
          <div className="w-type-display-md" style={{ marginTop: 6 }}>
            Wallet
          </div>
        </div>

        {newUpgrades.length > 0 && (
          <div style={{ padding: "20px 20px 0" }}>
            <div
              className="w-card"
              style={{
                padding: 14,
                borderColor: "var(--w-acc)",
                background: "var(--w-acc-soft)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Chip tone="acc">↑ TIER UPGRADE</Chip>
              <div style={{ flex: 1 }}>
                {newUpgrades.map((t) => (
                  <p
                    key={t.id}
                    className="w-type-body-sm"
                    style={{ marginTop: 0 }}
                  >
                    Bumped to{" "}
                    <strong>
                      {t.tier.replace(/_/g, " ").toUpperCase()}
                    </strong>{" "}
                    for <strong>{t.night.event.name}</strong>.
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stacked credential hero — handoff Wallet pattern */}
        {hero ? (
          <div style={{ padding: "32px 20px 0", position: "relative" }}>
            <div style={{ position: "relative", height: 320 }}>
              {stackBehind[1] && (
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    left: 12,
                    right: 12,
                    transform: "scale(.94)",
                    opacity: 0.35,
                    pointerEvents: "none",
                  }}
                >
                  <CredentialCard
                    variant="mono"
                    tier={tierFromString(stackBehind[1].tier)}
                    name={stackBehind[1].full_name}
                    event={stackBehind[1].night.event.name}
                    date={fmtCredDate(stackBehind[1].night.night_date)}
                    code={stackBehind[1].check_in_token
                      .slice(0, 11)
                      .toUpperCase()}
                  />
                </div>
              )}
              {stackBehind[0] && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 6,
                    right: 6,
                    transform: "scale(.97)",
                    opacity: 0.6,
                    pointerEvents: "none",
                  }}
                >
                  <CredentialCard
                    variant="mono"
                    tier={tierFromString(stackBehind[0].tier)}
                    name={stackBehind[0].full_name}
                    event={stackBehind[0].night.event.name}
                    date={fmtCredDate(stackBehind[0].night.night_date)}
                    code={stackBehind[0].check_in_token
                      .slice(0, 11)
                      .toUpperCase()}
                  />
                </div>
              )}
              <Link
                href={`/t/${hero.check_in_token}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  position: "relative",
                  zIndex: 2,
                  display: "block",
                }}
              >
                <CredentialCard
                  variant="mono"
                  tier={tierFromString(hero.tier)}
                  name={hero.full_name}
                  event={hero.night.event.name}
                  date={fmtCredDate(hero.night.night_date)}
                  code={hero.check_in_token.slice(0, 11).toUpperCase()}
                />
              </Link>
            </div>
          </div>
        ) : null}

        {!hero && rows.length === 0 ? (
          <div style={{ padding: "48px 20px 0", textAlign: "center" }}>
            <div className="w-type-h2">Nothing here yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              RSVP to an event and your ticket will appear here.
            </p>
            <Link
              href="/discover"
              className="w-btn w-btn--primary"
              style={{
                marginTop: 24,
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Browse events
            </Link>
          </div>
        ) : null}

        {upcoming.length > 1 && (
          <>
            <SectionLabel>UPCOMING · {upcoming.length - 1}</SectionLabel>
            <div style={{ padding: "0 20px" }}>
              {upcoming.slice(1).map((t, i, arr) => (
                <PastRow key={t.id} t={t} last={i === arr.length - 1} />
              ))}
            </div>
          </>
        )}

        {past.length > 0 && (
          <>
            <SectionLabel>PAST · {past.length}</SectionLabel>
            <div style={{ padding: "0 20px" }}>
              {past.map((t, i, arr) => (
                <PastRow key={t.id} t={t} last={i === arr.length - 1} />
              ))}
            </div>
          </>
        )}

        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 32,
            paddingBottom: 16,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          <Link
            href="/mytickets/profile"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            PROFILE
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
              SIGN OUT
            </button>
          </form>
        </div>
      </WFrame>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "32px 20px 12px" }}>
      <span className="w-type-meta">{children}</span>
    </div>
  );
}

function PastRow({ t, last }: { t: TicketRow; last: boolean }) {
  const tier = tierFromString(t.tier);
  const dt = new Date(t.night.night_date);
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dt.getDay()];
  return (
    <Link
      href={`/t/${t.check_in_token}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          padding: "14px 0",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: last ? "none" : "1px solid var(--w-line)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 0,
            background: "#ffffff08",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--w-mono)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 8, color: "var(--w-fg-muted)" }}>
            {dow}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>
            {String(dt.getDate()).padStart(2, "0")}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t.night.event.name}
          </div>
          <div
            className="w-type-meta"
            style={{
              marginTop: 2,
              color:
                t.status === "approved"
                  ? "var(--w-fg-muted)"
                  : t.status === "pending"
                    ? "var(--w-warn)"
                    : t.status === "rejected"
                      ? "var(--w-err)"
                      : "var(--w-fg-muted)",
            }}
          >
            {t.status === "approved"
              ? `DOORS ${fmtTime(t.night.doors_at)}`
              : t.status.toUpperCase()}
          </div>
        </div>
        <CredPill tier={tier} />
      </div>
    </Link>
  );
}
