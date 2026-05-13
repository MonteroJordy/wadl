import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/owner";
import {
  Avatar,
  Button,
  CapacityMeter,
  Chip,
  CredPill,
  WFrame,
  Wordmark,
} from "@/components/wadl";
import HolderAddForm from "./form";
import HolderIntroWizard from "./intro-wizard";
import CopyLinkButton from "./copy-link-button";

export const dynamic = "force-dynamic";

interface TokenData {
  token: string;
  revoked_at: string | null;
  expires_at: string | null;
  allocation: {
    id: string;
    event_night_id: string;
    holder_name: string;
    cap: number;
    auto_approve: boolean;
    list_open: boolean;
    plus_ones_allowed: boolean;
  };
}

function ErrorFrame({ title, body }: { title: string; body: string }) {
  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>
        <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
          <div className="w-type-meta">LIST OWNER</div>
          <div className="w-type-display-md" style={{ marginTop: 12 }}>
            {title}
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 16 }}
          >
            {body}
          </p>
          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: 280,
              marginInline: "auto",
            }}
          >
            <Link href="/discover" style={{ textDecoration: "none" }}>
              <Button variant="primary" block>
                Browse public events
              </Button>
            </Link>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Button variant="ghost" block>
                Back to home
              </Button>
            </Link>
          </div>
          <p
            className="w-type-meta"
            style={{
              marginTop: 24,
              color: "var(--w-fg-dim)",
            }}
          >
            NEED HELP?{" "}
            <a
              href="mailto:support@wadlwadl.com"
              style={{ color: "var(--w-acc)", textDecoration: "none" }}
            >
              EMAIL SUPPORT
            </a>
          </p>
        </div>
      </WFrame>
    </main>
  );
}

export default async function HolderPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { intro?: string };
}) {
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("allocation_tokens")
    .select(
      "token, revoked_at, expires_at, allocation:allocations!inner(id, event_night_id, holder_name, cap, auto_approve, list_open, plus_ones_allowed)",
    )
    .eq("token", params.token)
    .maybeSingle<TokenData>();

  if (!tokenRow) {
    return (
      <ErrorFrame
        title="Link not found."
        body="Check the link you were sent."
      />
    );
  }
  if (tokenRow.revoked_at) {
    return (
      <ErrorFrame
        title="Link rotated."
        body="Ask the host for the current link."
      />
    );
  }
  if (
    tokenRow.expires_at &&
    new Date(tokenRow.expires_at).getTime() < Date.now()
  ) {
    return (
      <ErrorFrame
        title="Link expired."
        body="Ask the host for a fresh one."
      />
    );
  }

  const alloc = tokenRow.allocation;

  const [nightRes, guestsRes, tierCapsRes] = await Promise.all([
    admin
      .from("event_nights")
      .select(
        "id, night_date, doors_at, is_frozen, event:events!inner(id, name, flyer_url)",
      )
      .eq("id", alloc.event_night_id)
      .maybeSingle<{
        id: string;
        night_date: string;
        doors_at: string;
        is_frozen: boolean;
        event: { id: string; name: string; flyer_url: string | null };
      }>(),
    admin
      .from("guests")
      .select("full_name, plus_ones, status, tier")
      .eq("allocation_id", alloc.id)
      .in("status", ["approved", "pending"]),
    // Day 50: per-tier sub-caps + sub-tokens for the wedge feature.
    // Falls back gracefully if migration hasn't been applied yet.
    admin
      .from("allocation_tier_caps")
      .select("id, tier, cap, sub_token, revoked_at")
      .eq("allocation_id", alloc.id)
      .order("tier", { ascending: false }),
  ]);

  const night = nightRes.data;
  if (!night) {
    return (
      <ErrorFrame
        title="Night not found."
        body="The event setup may have changed."
      />
    );
  }

  const guests = guestsRes.data ?? [];
  const used = guests.reduce(
    (sum, g) => sum + 1 + (g.plus_ones ?? 0),
    0,
  );
  const remaining = Math.max(0, alloc.cap - used);
  const listOpen = alloc.list_open && !night.is_frozen && remaining > 0;

  // Day 50 wedge: build per-tier rows w/ live counts. If migration isn't
  // applied yet, tierCapsRes errors and we render nothing for tiers.
  type TierKey = "GA" | "VIP" | "AAA";
  const tierCapRows = (tierCapsRes.data ?? []).filter(
    (r) => !r.revoked_at,
  ) as Array<{
    id: string;
    tier: string;
    cap: number;
    sub_token: string;
  }>;
  const usedByTier: Record<TierKey, number> = { GA: 0, VIP: 0, AAA: 0 };
  for (const g of guests) {
    const t = (g.tier ?? "ga").toUpperCase();
    const norm: TierKey = t.includes("VIP")
      ? "VIP"
      : t === "AAA" || t.includes("ALL")
        ? "AAA"
        : "GA";
    usedByTier[norm] += 1 + (g.plus_ones ?? 0);
  }

  const initials = alloc.holder_name
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark variant="monogrid" size={18} />
          <Avatar name={initials || "WL"} size={32} accent />
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <div className="w-type-meta">
            {fmtDate(night.night_date).toUpperCase()} ·{" "}
            {night.event.name.toUpperCase()}
          </div>
          <div className="w-type-display-md" style={{ marginTop: 6 }}>
            {alloc.holder_name}&apos;s list
          </div>
        </div>

        {night.event.flyer_url ? (
          <div style={{ padding: "20px 24px 0" }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 5",
                borderRadius: "var(--w-r-md)",
                overflow: "hidden",
                border: "1px solid var(--w-line)",
                background: "var(--w-surface-2)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={night.event.flyer_url}
                alt={night.event.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        ) : null}

        {night.is_frozen && (
          <div style={{ padding: "20px 24px 0" }}>
            <div
              className="w-card"
              style={{
                padding: 16,
                borderColor: "var(--w-warn)",
                background: "oklch(0.86 0.16 85 / 0.06)",
              }}
            >
              <Chip tone="warn">⚠ CAPACITY LOCKDOWN</Chip>
              <p
                className="w-type-body-sm"
                style={{ marginTop: 10, color: "var(--w-fg-muted)" }}
              >
                The night hit its capacity threshold and the host closed all
                lists. Already-on names keep their spot; no new adds.
              </p>
            </div>
          </div>
        )}

        <div style={{ padding: "24px 24px 0" }}>
          <div className="w-card" style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div className="w-type-meta">YOUR LIST</div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontSize: 56,
                    fontWeight: 700,
                    lineHeight: 0.94,
                    letterSpacing: "-0.035em",
                    marginTop: 4,
                  }}
                >
                  {used}
                  <span style={{ color: "var(--w-fg-dim)" }}>
                    /{alloc.cap}
                  </span>
                </div>
                <div className="w-type-meta" style={{ marginTop: 8 }}>
                  {alloc.auto_approve ? "AUTO-APPROVE" : "HOST APPROVES"}
                  {night.is_frozen ? " · NIGHT FROZEN" : ""}
                </div>
              </div>
              <Chip tone={listOpen ? "acc" : "ghost"}>
                {listOpen ? "OPEN" : "CLOSED"}
              </Chip>
            </div>
            <div style={{ marginTop: 16 }}>
              <CapacityMeter
                current={used}
                total={alloc.cap}
                accent
                label="USED"
              />
            </div>
            <div className="w-type-meta" style={{ marginTop: 12 }}>
              DOORS {fmtTime(night.doors_at)}
            </div>
          </div>
        </div>

        {/* Day 50 wedge: per-tier shareable links. One link per tier where
            cap > 0. Holder copies three URLs and routes each to the right
            audience (AAA in inner Signal, VIP in close circle, GA in IG bio). */}
        {tierCapRows.length > 0 && (
          <div style={{ padding: "24px 24px 0" }}>
            <div className="w-type-meta" style={{ marginBottom: 12 }}>
              SHAREABLE LINKS · {tierCapRows.length} TIER
              {tierCapRows.length === 1 ? "" : "S"}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {tierCapRows.map((tc) => {
                const tierKey = tc.tier.toUpperCase() as TierKey;
                const tierUsed = usedByTier[tierKey] ?? 0;
                const pct =
                  tc.cap > 0
                    ? Math.min(100, Math.round((tierUsed / tc.cap) * 100))
                    : 0;
                const link = `wadl.app/d/${tc.sub_token.slice(0, 6)}`;
                return (
                  <div
                    key={tc.id}
                    className="w-card"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <CredPill tier={tierKey} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--w-mono)",
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {link}
                      </div>
                      <div
                        className="w-type-meta"
                        style={{ marginTop: 4 }}
                      >
                        {tierUsed}/{tc.cap} · {pct}% FILLED
                      </div>
                    </div>
                    <CopyLinkButton
                      url={`/d/${tc.sub_token}`}
                      label="Copy"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ padding: "24px 24px 0" }}>
          <HolderAddForm
            token={params.token}
            plusOnesAllowed={alloc.plus_ones_allowed}
            listOpen={listOpen}
          />
        </div>

        {guests.length > 0 && (
          <div style={{ padding: "32px 24px 0" }}>
            <div className="w-type-meta" style={{ marginBottom: 12 }}>
              YOUR NAMES · {guests.length}
            </div>
            <div
              className="w-card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              {guests.map((g, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderBottom:
                      idx < guests.length - 1
                        ? "1px solid var(--w-line)"
                        : "none",
                  }}
                >
                  <Avatar name={g.full_name} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.full_name}
                    </div>
                    {g.plus_ones > 0 && (
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        +{g.plus_ones}
                      </div>
                    )}
                  </div>
                  {g.status === "approved" ? (
                    <Chip tone="ok">APPROVED</Chip>
                  ) : (
                    <Chip tone="ghost">PENDING</Chip>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="w-type-meta"
          style={{ marginTop: 32, padding: "0 24px", textAlign: "center" }}
        >
          TRACK YOUR SHOW RATE OVER TIME —{" "}
          <a
            href={`/holder/claim/${params.token}`}
            style={{
              color: "var(--w-acc)",
              textDecoration: "underline",
            }}
          >
            CLAIM
          </a>
        </div>

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
          POWERED BY <Wordmark variant="slash" size={11} />
        </div>

        <HolderIntroWizard
          token={params.token}
          holderName={alloc.holder_name}
          cap={alloc.cap}
          autoApprove={alloc.auto_approve}
          plusOnesAllowed={alloc.plus_ones_allowed}
          force={searchParams.intro === "1"}
        />
      </WFrame>
    </main>
  );
}
