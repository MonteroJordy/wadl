// Tier-scoped public sign-up. The wedge feature: a holder shares one of
// these links per credential tier (GA / VIP / AAA). Guest lands here,
// sees the tier they've been invited at, continues to the standard RSVP
// flow with `tier` preset on the form.
//
// Token format is opaque (`sub_token` from `allocation_tier_caps`). We
// validate server-side via the admin client; the table's RLS doesn't let
// guests read it directly.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import {
  Avatar,
  Button,
  CapacityMeter,
  Chip,
  CredPill,
  IconArrow,
  WFrame,
  Wordmark,
} from "@/components/wadl";
import type { Tier } from "@/components/wadl";

export const dynamic = "force-dynamic";

interface TierData {
  id: string;
  tier: string;
  cap: number;
  sub_token: string;
  revoked_at: string | null;
  allocation: {
    id: string;
    holder_name: string;
    list_open: boolean;
    event_night_id: string;
  };
}

function tierFromString(t: string): Tier {
  const u = t.toUpperCase();
  if (u.includes("VIP")) return "VIP";
  if (u === "AAA" || u.includes("ALL")) return "AAA";
  return "GA";
}

export default async function TierSubLinkPage({
  params,
}: {
  params: { subToken: string };
}) {
  const admin = createAdminClient();

  const { data: tierRow } = await admin
    .from("allocation_tier_caps")
    .select(
      "id, tier, cap, sub_token, revoked_at, " +
        "allocation:allocations!inner(id, holder_name, list_open, event_night_id)",
    )
    .eq("sub_token", params.subToken)
    .maybeSingle<TierData>();

  if (!tierRow) {
    return <ErrorFrame title="Link not found" body="This sub-link doesn't exist." />;
  }
  if (tierRow.revoked_at) {
    return (
      <ErrorFrame
        title="Link revoked"
        body="The host rotated this link. Ask for the current one."
      />
    );
  }

  const alloc = tierRow.allocation;
  if (!alloc.list_open) {
    return (
      <ErrorFrame
        title="List closed"
        body="The host closed this list. Existing names keep their spot."
      />
    );
  }

  // Pull night + event for the landing card.
  const { data: night } = await admin
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
    }>();

  if (!night) {
    return notFound();
  }

  // Live count for this tier on this allocation. Guards against over-fill
  // before the user even fills the form.
  const { data: usedRows } = await admin
    .from("guests")
    .select("plus_ones, status, tier")
    .eq("allocation_id", alloc.id)
    .in("status", ["approved", "pending"]);

  const tierUpper = tierRow.tier.toUpperCase();
  const tierUsed = (usedRows ?? [])
    .filter(
      (g) =>
        (g.tier ?? "ga").toUpperCase() === tierUpper ||
        (tierUpper === "AAA" && (g.tier ?? "").toUpperCase().includes("ALL")),
    )
    .reduce((sum, g) => sum + 1 + (g.plus_ones ?? 0), 0);

  const remaining = Math.max(0, tierRow.cap - tierUsed);
  const filled = remaining === 0;

  const tier = tierFromString(tierRow.tier);
  const initials = alloc.holder_name
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // RSVP route — the existing flow at /e/[eventId]/rsvp picks up tier
  // from query param and applies it to the new guest row.
  const rsvpHref = `/e/${night.event.id}/rsvp?night=${night.id}&tier=${tier.toLowerCase()}&allocation=${alloc.id}&sub=${tierRow.sub_token}`;

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
          <Chip tone="ghost">VIA INVITE</Chip>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Avatar name={initials || "WL"} size={28} accent />
            <span
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)" }}
            >
              <strong style={{ color: "var(--w-fg)" }}>
                {alloc.holder_name}
              </strong>{" "}
              invited you
            </span>
          </div>
          <div className="w-type-meta">
            {fmtDate(night.night_date).toUpperCase()} · DOORS{" "}
            {fmtTime(night.doors_at).toUpperCase()}
          </div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            {night.event.name}
          </div>
        </div>

        {night.event.flyer_url && (
          <div style={{ padding: "20px 24px 0" }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "4 / 5",
                border: "1px solid var(--w-line)",
                background: "var(--w-surface-2)",
                overflow: "hidden",
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
        )}

        {/* Tier card */}
        <div style={{ padding: "24px 24px 0" }}>
          <div
            className="w-card"
            style={{
              padding: 18,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  className="w-type-meta"
                  style={{ color: "var(--w-acc-ink)" }}
                >
                  YOUR CREDENTIAL
                </div>
                <div
                  style={{
                    fontFamily: "var(--w-display)",
                    fontWeight: 700,
                    fontSize: 32,
                    letterSpacing: "-0.025em",
                    marginTop: 4,
                    lineHeight: 1,
                  }}
                >
                  {tier} pass
                </div>
              </div>
              <CredPill tier={tier} />
            </div>
            <div style={{ marginTop: 14 }}>
              <CapacityMeter
                current={tierUsed}
                total={tierRow.cap}
                accent
                label={`${tier} CAPACITY · ${remaining} LEFT`}
              />
            </div>
          </div>
        </div>

        {filled || night.is_frozen ? (
          <div style={{ padding: "20px 24px 0" }}>
            <div
              className="w-card"
              style={{
                padding: 16,
                borderColor: "var(--w-warn)",
                background: "oklch(0.86 0.16 85 / 0.06)",
              }}
            >
              <Chip tone="warn">
                ⚠ {filled ? "TIER FULL" : "CAPACITY LOCKDOWN"}
              </Chip>
              <p
                className="w-type-body-sm"
                style={{ marginTop: 10, color: "var(--w-fg-muted)" }}
              >
                {filled
                  ? `${tier} is at cap. Ask the host for a different tier or a fresh slot.`
                  : "The night hit its capacity threshold. No new RSVPs."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "32px 24px 0" }}>
              <div className="w-type-h3">Get on the list — 30 seconds.</div>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                No account, no password. We text you a credential.
              </p>
            </div>
            <div style={{ padding: "20px 24px 0" }}>
              <Link href={rsvpHref} style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg" block>
                  Continue to RSVP <IconArrow size={14} />
                </Button>
              </Link>
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
          POWERED BY{" "}
          <Wordmark variant="slash" size={11} />
        </div>
      </WFrame>
    </main>
  );
}

function ErrorFrame({ title, body }: { title: string; body: string }) {
  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>
        <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
          <div className="w-type-meta">SUB-LINK</div>
          <div className="w-type-display-md" style={{ marginTop: 12 }}>
            {title}
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
            }}
          >
            {body}
          </p>
          <Link
            href="/discover"
            className="w-btn w-btn--ghost"
            style={{
              marginTop: 24,
              textDecoration: "none",
              display: "inline-flex",
            }}
          >
            Browse other events
          </Link>
        </div>
      </WFrame>
    </main>
  );
}
