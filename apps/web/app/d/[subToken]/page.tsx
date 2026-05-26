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
import { Cover, Logo } from "@/components/v5";

export const dynamic = "force-dynamic";

type Tier = "GA" | "VIP" | "AAA";

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
  const tierPct =
    tierRow.cap > 0
      ? Math.min(100, Math.round((tierUsed / tierRow.cap) * 100))
      : 0;

  const tier = tierFromString(tierRow.tier);

  // RSVP route — the existing flow at /e/[eventId]/rsvp picks up tier
  // from query param and applies it to the new guest row.
  const rsvpHref = `/e/${night.event.id}/rsvp?night=${night.id}&tier=${tier.toLowerCase()}&allocation=${alloc.id}&sub=${tierRow.sub_token}`;

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div
        style={{
          padding: "var(--s-6) var(--s-6) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={18} />
        <span className="chip chip--ghost">Via invite</span>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <div className="t-body-2" style={{ marginBottom: "var(--s-3)" }}>
          <strong style={{ color: "var(--fg)" }}>{alloc.holder_name}</strong>{" "}
          invited you
        </div>
        <div className="t-meta">
          {fmtDate(night.night_date)} · Doors {fmtTime(night.doors_at)}
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          {night.event.name}
        </div>
      </div>

      {night.event.flyer_url && (
        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 5",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line)",
              background: "var(--bg-3)",
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
      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div
          className="card"
          style={{ padding: "var(--s-5)", borderColor: "var(--fg)" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--s-3)",
            }}
          >
            <div>
              <div className="t-meta">You&apos;re invited as</div>
              <div
                className="t-display-sm"
                style={{ marginTop: "var(--s-1)" }}
              >
                {tier} pass
              </div>
            </div>
            <span className="chip chip--solid">{tier}</span>
          </div>
          <div
            style={{
              marginTop: "var(--s-4)",
              height: 4,
              background: "var(--line)",
              borderRadius: "var(--r-pill)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${tierPct}%`,
                background: "var(--fg)",
              }}
            />
          </div>
          <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
            {tier} capacity · {remaining} left
          </div>
        </div>
      </div>

      {filled || night.is_frozen ? (
        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <div
            className="card"
            style={{ padding: "var(--s-4)", borderColor: "var(--warn)" }}
          >
            <span className="chip chip--warn">
              {filled ? "Tier full" : "Capacity lockdown"}
            </span>
            <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
              {filled
                ? `${tier} is at cap. Ask the host for a different tier or a fresh slot.`
                : "The night hit its capacity threshold. No new RSVPs."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
            <div className="t-h1">Get on the list — 30 seconds.</div>
            <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              No account, no password. We text you a credential.
            </p>
          </div>
          <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
            <Link
              href={rsvpHref}
              className="btn btn--lg btn--accent btn--block"
              style={{ textDecoration: "none" }}
            >
              Continue to RSVP
            </Link>
          </div>
        </>
      )}

      <div
        style={{
          paddingTop: "var(--s-8)",
          paddingBottom: "var(--s-12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--s-2)",
        }}
      >
        <span className="t-meta">Powered by</span>
        <Logo size={11} />
      </div>
    </main>
  );
}

function ErrorFrame({ title, body }: { title: string; body: string }) {
  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <Logo size={18} />
      </div>
      <div
        style={{
          padding: "var(--s-24) var(--s-6) 0",
          textAlign: "center",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Sub-link</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          {title}
        </div>
        <p className="t-body-2" style={{ marginTop: "var(--s-4)" }}>
          {body}
        </p>
        <Link
          href="/discover"
          className="btn btn--ghost"
          style={{
            marginTop: "var(--s-6)",
            textDecoration: "none",
          }}
        >
          Browse other events
        </Link>
      </div>
    </main>
  );
}
