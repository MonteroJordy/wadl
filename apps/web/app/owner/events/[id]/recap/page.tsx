import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeRecap, computeFeedback, fmtHour } from "@/lib/recap";
import { fmtDate } from "@/lib/format";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";

export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function RecapPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { night?: string };
}) {
  const { supabase, account } = await requireOwnerContext();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, account_id, event_nights(id, night_date, doors_at, capacity_cap)",
    )
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const nights = (
    (event.event_nights ?? []) as Array<{
      id: string;
      night_date: string;
      doors_at: string;
      capacity_cap: number | null;
    }>
  ).sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  const activeNight = nights.find((n) => n.id === searchParams.night) ?? null;

  // Recap + feedback are independent — parallelize. Feedback is event-scoped
  // (one per event-per-guest, not per-night) so we only fetch it for the
  // whole-event view; on a per-night drill-down it's null.
  const [recap, feedback] = await Promise.all([
    computeRecap(event.id, activeNight?.id),
    activeNight ? Promise.resolve(null) : computeFeedback(event.id),
  ]);
  const peakCount = recap.peakHour?.count ?? 0;

  const scopeLabel = activeNight
    ? fmtDate(activeNight.night_date)
    : "Whole event";

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Recap",
        ]}
      />
      <PageHeader
        eyebrow={`Recap · ${scopeLabel}`}
        title={event.name}
        sub="Post-event numbers — show rate, tiers, peak hour, top holders."
      />
      <EventSubNav active="overview" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {nights.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "var(--s-1)",
              overflowX: "auto",
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-1)",
            }}
          >
            <Link
              href={`/owner/events/${event.id}/recap`}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <span
                className={`chip ${
                  activeNight === null ? "chip--solid" : "chip--ghost"
                }`}
              >
                All nights
              </span>
            </Link>
            {nights.map((n) => (
              <Link
                key={n.id}
                href={`/owner/events/${event.id}/recap?night=${n.id}`}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <span
                  className={`chip ${
                    activeNight?.id === n.id ? "chip--solid" : "chip--ghost"
                  }`}
                >
                  {fmtDate(n.night_date)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {recap.totalApproved === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-16) var(--s-8)", textAlign: "center" }}
          >
            <div className="t-h1">No data yet</div>
            <div
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              Recap fills in once guests are approved and scanned at the door.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-3)",
            }}
          >
            <section className="card" style={{ padding: "var(--s-6)" }}>
              <div className="t-meta">Show rate</div>
              <div
                className="t-display-lg t-num"
                style={{ marginTop: "var(--s-2)" }}
              >
                {pct(recap.showRate)}
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--bg-3)",
                  borderRadius: "var(--r-pill)",
                  marginTop: "var(--s-4)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--fg)",
                    width: `${Math.min(100, recap.showRate * 100)}%`,
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "var(--s-3)",
                  marginTop: "var(--s-5)",
                }}
              >
                <RecapStat label="Approved" value={recap.totalApproved} />
                <RecapStat
                  label="Scanned in"
                  value={recap.totalCheckedIn}
                  tone="ok"
                />
                <RecapStat
                  label="Cap"
                  value={recap.capacity || "—"}
                  tone="muted"
                />
              </div>
            </section>

            {recap.tiers.length > 0 && (
              <section className="card" style={{ padding: "var(--s-5)" }}>
                <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
                  Tier breakdown
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-4)",
                  }}
                >
                  {recap.tiers.map((t) => (
                    <div key={t.tier}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          marginBottom: "var(--s-2)",
                        }}
                      >
                        <span className="t-body">
                          {t.tier.replace("_", " ")}
                        </span>
                        <span className="t-meta">
                          <span style={{ color: "var(--ok)" }}>
                            {t.checkedIn}
                          </span>{" "}
                          / {t.approved} · {pct(t.showRate)}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "var(--bg-3)",
                          borderRadius: "var(--r-pill)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: "var(--ok)",
                            width: `${Math.min(100, t.showRate * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {recap.hourBuckets.length > 0 && (
              <section className="card" style={{ padding: "var(--s-5)" }}>
                <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
                  Check-ins by hour
                  {recap.peakHour && (
                    <>
                      {" · peak "}
                      {fmtHour(recap.peakHour.hour)} ({recap.peakHour.count})
                    </>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 4,
                    height: 110,
                  }}
                >
                  {recap.hourBuckets.map((b) => {
                    const h =
                      peakCount === 0 ? 0 : (b.count / peakCount) * 100;
                    const isPeak = b.hour === recap.peakHour?.hour;
                    return (
                      <div
                        key={b.hour}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          height: "100%",
                        }}
                        title={`${fmtHour(b.hour)}: ${b.count}`}
                      >
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "flex-end",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: `${Math.max(4, h)}%`,
                              background: isPeak
                                ? "var(--fg)"
                                : "var(--fg-3)",
                              borderRadius: "var(--r-sm)",
                            }}
                          />
                        </div>
                        <div className="t-meta" style={{ fontSize: 9 }}>
                          {fmtHour(b.hour)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {recap.topHolders.length > 0 && (
              <section className="card" style={{ padding: "var(--s-5)" }}>
                <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
                  Top promoters / holders
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {recap.topHolders.slice(0, 5).map((h, i) => (
                    <div
                      key={h.allocation_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--s-3) 0",
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--line)",
                      }}
                    >
                      <span className="t-body truncate" style={{ flex: 1 }}>
                        <span
                          className="t-num"
                          style={{
                            color: "var(--fg-4)",
                            fontFamily: "var(--mono)",
                            fontSize: "var(--ts-sm)",
                            marginRight: "var(--s-2)",
                          }}
                        >
                          {i + 1}.
                        </span>
                        {h.holder_name}
                      </span>
                      <span
                        className="t-meta"
                        style={{
                          flexShrink: 0,
                          marginLeft: "var(--s-3)",
                        }}
                      >
                        <span style={{ color: "var(--ok)" }}>
                          {h.scanned}
                        </span>{" "}
                        / {h.approved} · {pct(h.showRate)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="card" style={{ padding: "var(--s-5)" }}>
              <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
                No-shows · {recap.noShows.length}
              </div>
              {recap.noShows.length === 0 ? (
                <div className="t-body-2">
                  Everyone approved scanned in.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {recap.noShows.slice(0, 40).map((g) => (
                    <Link
                      key={g.id}
                      href={`/owner/events/${event.id}/guests/${g.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--s-3) 0",
                        borderTop: "1px solid var(--line)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span className="t-body truncate" style={{ flex: 1 }}>
                        {g.full_name}
                        {g.plus_ones > 0 && (
                          <span style={{ color: "var(--fg-3)" }}>
                            {" "}
                            +{g.plus_ones}
                          </span>
                        )}
                      </span>
                      <span
                        className="t-meta"
                        style={{
                          flexShrink: 0,
                          marginLeft: "var(--s-3)",
                        }}
                      >
                        {g.tier}
                        {g.allocation_name && <> · {g.allocation_name}</>}
                      </span>
                    </Link>
                  ))}
                  {recap.noShows.length > 40 && (
                    <div
                      className="t-meta"
                      style={{ marginTop: "var(--s-3)" }}
                    >
                      + {recap.noShows.length - 40} more — see full list in
                      export
                    </div>
                  )}
                </div>
              )}
            </section>

            {feedback && feedback.responseCount > 0 && (
              <section className="card" style={{ padding: "var(--s-5)" }}>
                <div
                  className="t-meta"
                  style={{ marginBottom: "var(--s-4)" }}
                >
                  Guest feedback · {feedback.responseCount} response
                  {feedback.responseCount === 1 ? "" : "s"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "var(--s-3)",
                    marginBottom: "var(--s-4)",
                  }}
                >
                  <div className="t-display-md t-num">
                    {feedback.averageRating.toFixed(1)}
                  </div>
                  <div className="t-meta">/ 5 average</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginBottom: "var(--s-5)",
                  }}
                >
                  {([5, 4, 3, 2, 1] as const).map((stars) => {
                    const c = feedback.ratingDist[stars] ?? 0;
                    const pctVal =
                      feedback.responseCount === 0
                        ? 0
                        : (c / feedback.responseCount) * 100;
                    return (
                      <div
                        key={stars}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--s-2)",
                        }}
                      >
                        <div
                          className="t-meta"
                          style={{ width: 28, flexShrink: 0 }}
                        >
                          {stars}★
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: "var(--bg-3)",
                            borderRadius: "var(--r-pill)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              background: "var(--fg)",
                              width: `${pctVal}%`,
                            }}
                          />
                        </div>
                        <div
                          className="t-meta"
                          style={{
                            width: 32,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {c}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {feedback.topTags.length > 0 && (
                  <>
                    <div
                      className="t-meta"
                      style={{ marginBottom: "var(--s-2)" }}
                    >
                      Top tags
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "var(--s-1)",
                        marginBottom: "var(--s-5)",
                      }}
                    >
                      {feedback.topTags.map((t) => (
                        <span key={t.tag} className="chip chip--ghost">
                          {t.tag} · {t.count}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {feedback.recentComments.length > 0 && (
                  <>
                    <div
                      className="t-meta"
                      style={{ marginBottom: "var(--s-2)" }}
                    >
                      Recent comments
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--s-3)",
                      }}
                    >
                      {feedback.recentComments.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            borderLeft: "2px solid var(--line-2)",
                            paddingLeft: "var(--s-3)",
                            paddingTop: "var(--s-1)",
                            paddingBottom: "var(--s-1)",
                          }}
                        >
                          <div
                            className="t-meta"
                            style={{ marginBottom: "var(--s-1)" }}
                          >
                            {"★".repeat(c.rating)}
                            <span style={{ color: "var(--fg-4)" }}>
                              {"★".repeat(5 - c.rating)}
                            </span>
                          </div>
                          <p
                            className="t-body-2"
                            style={{
                              color: "var(--fg-2)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {c.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              <Link
                href={`/owner/events/${event.id}/export`}
                className="btn btn--ghost"
                style={{ textDecoration: "none", flex: 1 }}
              >
                Export CSV
              </Link>
              <Link
                href={`/owner/events/${event.id}/print`}
                className="btn btn--ghost"
                style={{ textDecoration: "none", flex: 1 }}
              >
                Print roster
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function RecapStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "muted";
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "muted"
        ? "var(--fg-3)"
        : "var(--fg)";
  return (
    <div>
      <div className="t-meta">{label}</div>
      <div
        className="t-h1 t-num"
        style={{ marginTop: "var(--s-1)", color }}
      >
        {value}
      </div>
    </div>
  );
}
