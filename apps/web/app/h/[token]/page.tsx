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

/**
 * V5 mobile shell — every holder surface (error + main) sits inside the same
 * centered 420-wide column so the page reads as a single coherent "pass".
 */
function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="v5"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>{children}</div>
    </main>
  );
}

function ErrorFrame({ title, body }: { title: string; body: string }) {
  return (
    <MobileShell>
      <div style={{ padding: "var(--s-6) var(--s-5) 0" }}>
        <Logo size={18} />
      </div>
      <div
        style={{
          padding: "var(--s-12) var(--s-5) 0",
          textAlign: "center",
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
    </MobileShell>
  );
}

/**
 * Compute a short, human countdown string for "Doors in …". Returns null when
 * doors are in the past — caller flips the copy to "Doors open" in that case.
 */
function doorsCountdown(doorsAt: string): string | null {
  const ms = new Date(doorsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

  const countdown = doorsCountdown(night.doors_at);

  return (
    <MobileShell>
      {/* ── Top bar: logo + role chip ── */}
      <div
        style={{
          padding: "var(--s-5) var(--s-5) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={18} />
        <span className="chip chip--ghost">List owner</span>
      </div>

      {/* ── "TONIGHT" hero: date · event · doors countdown ── */}
      <div style={{ padding: "var(--s-5) var(--s-5) 0" }}>
        <div className="t-meta">Tonight</div>
        <div
          className="t-display-md"
          style={{ marginTop: "var(--s-1)", lineHeight: 1.05 }}
        >
          {alloc.holder_name}&apos;s list
        </div>
        <div
          className="t-body-2"
          style={{ marginTop: "var(--s-2)", color: "var(--fg-2)" }}
        >
          {fmtDate(night.night_date)} · {night.event.name}
        </div>
        <div
          className="t-meta"
          style={{ marginTop: "var(--s-1)", color: "var(--fg-3)" }}
        >
          {countdown
            ? `Doors in ${countdown}`
            : `Doors ${fmtTime(night.doors_at)} · open`}
        </div>
      </div>

      {/* ── Pass card: cover (flyer or procedural) + tier/list summary ── */}
      <div style={{ padding: "var(--s-4) var(--s-5) 0" }}>
        <div
          className="card"
          style={{
            overflow: "hidden",
            border: "1.5px solid var(--fg)",
            padding: 0,
          }}
        >
          {night.event.flyer_url ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4 / 5",
                overflow: "hidden",
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
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.72) 100%)",
                }}
              />
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
                  {fmtDate(night.night_date)}
                </div>
                <div
                  className="t-h1"
                  style={{ color: "#fff", marginTop: "var(--s-1)" }}
                >
                  {night.event.name}
                </div>
              </div>
            </div>
          ) : (
            <Cover
              seed={night.event.name}
              style={{ borderRadius: 0, height: undefined, aspectRatio: "4 / 5" }}
            >
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
                  {fmtDate(night.night_date)}
                </div>
                <div
                  className="t-h1"
                  style={{ color: "#fff", marginTop: "var(--s-1)" }}
                >
                  {night.event.name}
                </div>
              </div>
            </Cover>
          )}
          {/* Tier/list summary strip (mirrors V5GuestWalletV2's VIP · party of N row) */}
          <div
            style={{
              padding: "var(--s-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--s-3)",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="t-h2"
                style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}
              >
                <span
                  className="t-num"
                  style={{ fontWeight: 600 }}
                >
                  {used}
                </span>
                <span style={{ color: "var(--fg-4)" }}>/{alloc.cap}</span>
                <span style={{ color: "var(--fg-3)" }}>names</span>
              </div>
              <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
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
          {/* Slim progress under the strip */}
          <div
            style={{
              height: 3,
              background: "var(--line)",
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
        </div>
      </div>

      {night.is_frozen && (
        <div style={{ padding: "var(--s-4) var(--s-5) 0" }}>
          <div
            className="card"
            style={{ padding: "var(--s-4)", borderColor: "var(--warn)" }}
          >
            <span className="chip chip--warn">Capacity lockdown</span>
            <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
              The night hit its capacity threshold and the host closed all
              lists. Already-on names keep their spot; no new adds.
            </p>
          </div>
        </div>
      )}

      {/* ── Add a name form ── */}
      <div style={{ padding: "var(--s-6) var(--s-5) 0" }}>
        <HolderAddForm
          token={params.token}
          plusOnesAllowed={alloc.plus_ones_allowed}
          listOpen={listOpen}
        />
      </div>

      {/* ── Day 50 wedge: per-tier shareable links ── */}
      {tierCapRows.length > 0 && (
        <div style={{ padding: "var(--s-8) var(--s-5) 0" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
            Shareable links · {tierCapRows.length} tier
            {tierCapRows.length === 1 ? "" : "s"}
          </div>
          <div className="card" style={{ padding: 0 }}>
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
                  className="row"
                  style={{
                    gridTemplateColumns: "auto 1fr auto",
                  }}
                >
                  <span className="chip chip--solid">{tierKey}</span>
                  <div style={{ minWidth: 0 }}>
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

      {/* ── Your names ── */}
      {guests.length > 0 && (
        <div style={{ padding: "var(--s-8) var(--s-5) 0" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
            Your names · {guests.length}
          </div>
          <div className="card" style={{ padding: 0 }}>
            {guests.map((g, idx) => (
              <div
                key={idx}
                className="row"
                style={{
                  gridTemplateColumns: "1fr auto",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    className="t-body truncate"
                    style={{ fontWeight: 500 }}
                  >
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

      {/* ── Footer: claim link + powered-by ── */}
      <div
        className="t-meta"
        style={{
          marginTop: "var(--s-8)",
          padding: "0 var(--s-5)",
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
          paddingTop: "var(--s-6)",
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
    </MobileShell>
  );
}
