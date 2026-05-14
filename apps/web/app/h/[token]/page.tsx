import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { fmtDate, fmtTime } from "@/lib/owner";
import { Cover, Logo } from "@/components/v5";
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
        <div className="t-meta">List owner</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          {title}
        </div>
        <p className="t-body-2" style={{ marginTop: "var(--s-4)" }}>
          {body}
        </p>
        <div
          style={{
            marginTop: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
            maxWidth: 280,
            marginInline: "auto",
          }}
        >
          <Link
            href="/discover"
            className="btn btn--block"
            style={{ textDecoration: "none" }}
          >
            Browse public events
          </Link>
          <Link
            href="/"
            className="btn btn--ghost btn--block"
            style={{ textDecoration: "none" }}
          >
            Back to home
          </Link>
        </div>
        <p className="t-meta" style={{ marginTop: "var(--s-6)" }}>
          Need help?{" "}
          <a
            href="mailto:support@wadlwadl.com"
            style={{ color: "var(--fg)", textDecoration: "none" }}
          >
            Email support
          </a>
        </p>
      </div>
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
  const capPct =
    alloc.cap > 0 ? Math.min(100, Math.round((used / alloc.cap) * 100)) : 0;

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

  // Bug fix (COO audit): shareable links must copy a fully-qualified URL,
  // not a relative `/d/...` path. Resolve the real host server-side so the
  // displayed text and the copied value both reflect the actual origin.
  const appUrl = getAppUrl();
  const appHost = appUrl.replace(/^https?:\/\//, "");

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
        <span className="chip chip--ghost">List owner</span>
      </div>

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div className="t-meta">
          {fmtDate(night.night_date)} · {night.event.name}
        </div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          {alloc.holder_name}&apos;s list
        </div>
      </div>

      {night.event.flyer_url ? (
        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 5",
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
              border: "1px solid var(--line)",
              background: "var(--bg-3)",
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
        <div style={{ padding: "var(--s-5) var(--s-6) 0" }}>
          <div
            className="card"
            style={{ padding: "var(--s-4)", borderColor: "var(--warn)" }}
          >
            <span className="chip chip--warn">Capacity lockdown</span>
            <p
              className="t-body-2"
              style={{ marginTop: "var(--s-3)" }}
            >
              The night hit its capacity threshold and the host closed all
              lists. Already-on names keep their spot; no new adds.
            </p>
          </div>
        </div>
      )}

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div className="card" style={{ padding: "var(--s-5)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div className="t-meta">Your list</div>
              <div
                className="t-display-lg t-num"
                style={{ marginTop: "var(--s-1)" }}
              >
                {used}
                <span style={{ color: "var(--fg-4)" }}>/{alloc.cap}</span>
              </div>
              <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                {alloc.auto_approve ? "Auto-approve" : "Host approves"}
                {night.is_frozen ? " · Night frozen" : ""}
              </div>
            </div>
            <span
              className={"chip " + (listOpen ? "chip--ok" : "chip--ghost")}
            >
              {listOpen ? "Open" : "Closed"}
            </span>
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
                width: `${capPct}%`,
                background: "var(--fg)",
              }}
            />
          </div>
          <div
            className="t-meta"
            style={{
              marginTop: "var(--s-2)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{capPct}% used</span>
            <span>Doors {fmtTime(night.doors_at)}</span>
          </div>
        </div>
      </div>

      {/* Day 50 wedge: per-tier shareable links. One link per tier where
          cap > 0. Holder copies three URLs and routes each to the right
          audience (AAA in inner Signal, VIP in close circle, GA in IG bio). */}
      {tierCapRows.length > 0 && (
        <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Shareable links · {tierCapRows.length} tier
            {tierCapRows.length === 1 ? "" : "s"}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-3)",
            }}
          >
            {tierCapRows.map((tc) => {
              const tierKey = tc.tier.toUpperCase() as TierKey;
              const tierUsed = usedByTier[tierKey] ?? 0;
              const pct =
                tc.cap > 0
                  ? Math.min(100, Math.round((tierUsed / tc.cap) * 100))
                  : 0;
              // Real host + short token preview for the display text; the
              // copy action receives the full absolute URL below.
              const displayLink = `${appHost}/d/${tc.sub_token.slice(0, 6)}`;
              const absoluteUrl = `${appUrl}/d/${tc.sub_token}`;
              return (
                <div
                  key={tc.id}
                  className="card"
                  style={{
                    padding: "var(--s-3) var(--s-4)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--s-3)",
                  }}
                >
                  <span className="chip chip--solid">{tierKey}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="t-body-2 truncate"
                      style={{
                        fontFamily: "var(--w-mono)",
                        color: "var(--fg)",
                      }}
                    >
                      {displayLink}
                    </div>
                    <div
                      className="t-meta"
                      style={{ marginTop: "var(--s-1)" }}
                    >
                      {tierUsed}/{tc.cap} · {pct}% filled
                    </div>
                  </div>
                  <CopyLinkButton url={absoluteUrl} label="Copy" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <HolderAddForm
          token={params.token}
          plusOnesAllowed={alloc.plus_ones_allowed}
          listOpen={listOpen}
        />
      </div>

      {guests.length > 0 && (
        <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Your names · {guests.length}
          </div>
          <div className="card">
            {guests.map((g, idx) => (
              <div
                key={idx}
                style={{
                  padding: "var(--s-3) var(--s-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s-3)",
                  borderBottom:
                    idx < guests.length - 1
                      ? "1px solid var(--line)"
                      : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-body truncate" style={{ fontWeight: 500 }}>
                    {g.full_name}
                  </div>
                  {g.plus_ones > 0 && (
                    <div
                      className="t-meta"
                      style={{ marginTop: "var(--s-1)" }}
                    >
                      +{g.plus_ones}
                    </div>
                  )}
                </div>
                <span
                  className={
                    "chip " +
                    (g.status === "approved" ? "chip--ok" : "chip--ghost")
                  }
                >
                  {g.status === "approved" ? "Approved" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="t-meta"
        style={{
          marginTop: "var(--s-8)",
          padding: "0 var(--s-6)",
          textAlign: "center",
        }}
      >
        Track your show rate over time —{" "}
        <a
          href={`/holder/claim/${params.token}`}
          style={{ color: "var(--fg)", textDecoration: "underline" }}
        >
          Claim
        </a>
      </div>

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

      <HolderIntroWizard
        token={params.token}
        holderName={alloc.holder_name}
        cap={alloc.cap}
        autoApprove={alloc.auto_approve}
        plusOnesAllowed={alloc.plus_ones_allowed}
        force={searchParams.intro === "1"}
      />
    </main>
  );
}
