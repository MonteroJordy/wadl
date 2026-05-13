import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { computeRecap, computeFeedback, fmtHour } from "@/lib/recap";
import { fmtDate } from "@/lib/format";
import { Button, Chip } from "@/components/wadl";

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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Link
            href={`/owner/events/${event.id}`}
            className="w-type-meta"
            style={{ color: "var(--w-fg-muted)", textDecoration: "none" }}
          >
            ← BACK
          </Link>
          <div className="w-type-meta">RECAP</div>
        </div>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-display-md">{event.name}</div>
          <p
            className="w-type-meta"
            style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
          >
            {scopeLabel.toUpperCase()}
          </p>
        </div>

        {nights.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              marginBottom: 16,
              paddingBottom: 4,
            }}
          >
            <Link
              href={`/owner/events/${event.id}/recap`}
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <Chip tone={activeNight === null ? "acc" : "ghost"}>
                ALL NIGHTS
              </Chip>
            </Link>
            {nights.map((n) => (
              <Link
                key={n.id}
                href={`/owner/events/${event.id}/recap?night=${n.id}`}
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                <Chip tone={activeNight?.id === n.id ? "acc" : "ghost"}>
                  {fmtDate(n.night_date).toUpperCase()}
                </Chip>
              </Link>
            ))}
          </div>
        )}

        {recap.totalApproved === 0 ? (
          <div
            className="w-card"
            style={{
              padding: "64px 32px",
              textAlign: "center",
            }}
          >
            <div className="w-type-h1">No data yet</div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
                maxWidth: 460,
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Recap fills in once guests are approved and scanned at the door.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <section
              className="w-card"
              style={{
                padding: 24,
                borderColor: "var(--w-acc)",
                background: "var(--w-acc-soft)",
              }}
            >
              <div className="w-type-meta">SHOW RATE</div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 72,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  marginTop: 8,
                  color: "var(--w-acc-ink)",
                }}
              >
                {pct(recap.showRate)}
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--w-surface-3)",
                  marginTop: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "var(--w-acc-ink)",
                    width: `${Math.min(100, recap.showRate * 100)}%`,
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <RecapStat label="APPROVED" value={recap.totalApproved} />
                <RecapStat
                  label="SCANNED IN"
                  value={recap.totalCheckedIn}
                  tone="ok"
                />
                <RecapStat
                  label="CAP"
                  value={recap.capacity || "—"}
                  tone="muted"
                />
              </div>
            </section>

            {recap.tiers.length > 0 && (
              <section className="w-card" style={{ padding: 20 }}>
                <div className="w-type-meta" style={{ marginBottom: 14 }}>
                  TIER BREAKDOWN
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {recap.tiers.map((t) => (
                    <div key={t.tier}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <p style={{ color: "var(--w-fg)" }}>
                          {t.tier.replace("_", " ").toUpperCase()}
                        </p>
                        <div className="w-type-meta">
                          <span style={{ color: "var(--w-ok)" }}>
                            {t.checkedIn}
                          </span>{" "}
                          / {t.approved}
                          <span style={{ color: "var(--w-acc)" }}>
                            {" · "}
                            {pct(t.showRate)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "var(--w-surface-3)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: "var(--w-ok)",
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
              <section className="w-card" style={{ padding: 20 }}>
                <div className="w-type-meta" style={{ marginBottom: 14 }}>
                  CHECK-INS BY HOUR
                  {recap.peakHour && (
                    <>
                      {" · PEAK "}
                      <span style={{ color: "var(--w-acc)" }}>
                        {fmtHour(recap.peakHour.hour).toUpperCase()}
                      </span>{" "}
                      ({recap.peakHour.count})
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
                    const h = peakCount === 0 ? 0 : (b.count / peakCount) * 100;
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
                                ? "var(--w-acc)"
                                : "var(--w-ok)",
                              opacity: isPeak ? 1 : 0.6,
                            }}
                          />
                        </div>
                        <div
                          className="w-type-meta"
                          style={{ fontSize: 9 }}
                        >
                          {fmtHour(b.hour).toUpperCase()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {recap.topHolders.length > 0 && (
              <section className="w-card" style={{ padding: 20 }}>
                <div className="w-type-meta" style={{ marginBottom: 14 }}>
                  TOP PROMOTERS / HOLDERS
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {recap.topHolders.slice(0, 5).map((h, i) => (
                    <div
                      key={h.allocation_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderTop:
                          i === 0 ? "none" : "1px solid var(--w-line)",
                      }}
                    >
                      <p
                        style={{
                          color: "var(--w-fg)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--w-fg-dim)",
                            fontFamily: "var(--w-mono)",
                            fontSize: 12,
                            marginRight: 8,
                          }}
                        >
                          {i + 1}.
                        </span>
                        {h.holder_name}
                      </p>
                      <div
                        className="w-type-meta"
                        style={{ flexShrink: 0, marginLeft: 12 }}
                      >
                        <span style={{ color: "var(--w-ok)" }}>
                          {h.scanned}
                        </span>{" "}
                        / {h.approved}
                        <span style={{ color: "var(--w-fg-muted)" }}>
                          {" · "}
                          {pct(h.showRate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="w-card" style={{ padding: 20 }}>
              <div className="w-type-meta" style={{ marginBottom: 12 }}>
                NO-SHOWS
                <span style={{ color: "var(--w-fg-muted)" }}>
                  {" · "}
                  {recap.noShows.length}
                </span>
              </div>
              {recap.noShows.length === 0 ? (
                <p
                  className="w-type-body-sm"
                  style={{ color: "var(--w-fg-muted)" }}
                >
                  Everyone approved scanned in.
                </p>
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
                        padding: "10px 0",
                        borderTop: "1px solid var(--w-line)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <p
                        style={{
                          color: "var(--w-fg)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {g.full_name}
                        {g.plus_ones > 0 && (
                          <span style={{ color: "var(--w-fg-muted)" }}>
                            {" "}
                            +{g.plus_ones}
                          </span>
                        )}
                      </p>
                      <div
                        className="w-type-meta"
                        style={{ flexShrink: 0, marginLeft: 12 }}
                      >
                        {g.tier.toUpperCase()}
                        {g.allocation_name && <> · {g.allocation_name}</>}
                      </div>
                    </Link>
                  ))}
                  {recap.noShows.length > 40 && (
                    <p
                      className="w-type-meta"
                      style={{
                        marginTop: 12,
                        color: "var(--w-fg-muted)",
                      }}
                    >
                      + {recap.noShows.length - 40} MORE — SEE FULL LIST IN
                      EXPORT
                    </p>
                  )}
                </div>
              )}
            </section>

            {feedback && feedback.responseCount > 0 && (
              <section className="w-card" style={{ padding: 20 }}>
                <div className="w-type-meta" style={{ marginBottom: 14 }}>
                  GUEST FEEDBACK
                  <span style={{ color: "var(--w-fg-muted)" }}>
                    {" · "}
                    {feedback.responseCount} RESPONSE
                    {feedback.responseCount === 1 ? "" : "S"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--w-display)",
                      fontWeight: 700,
                      fontSize: 36,
                      lineHeight: 1,
                      color: "var(--w-acc)",
                    }}
                  >
                    {feedback.averageRating.toFixed(1)}
                  </div>
                  <div className="w-type-meta">/ 5 AVERAGE</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginBottom: 18,
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
                          gap: 8,
                        }}
                      >
                        <div
                          className="w-type-meta"
                          style={{ width: 28, flexShrink: 0 }}
                        >
                          {stars}★
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: "var(--w-surface-2)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              background: "var(--w-acc)",
                              width: `${pctVal}%`,
                            }}
                          />
                        </div>
                        <div
                          className="w-type-meta"
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
                      className="w-type-meta"
                      style={{ marginBottom: 8 }}
                    >
                      TOP TAGS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 18,
                      }}
                    >
                      {feedback.topTags.map((t) => (
                        <Chip key={t.tag} tone="ghost">
                          {t.tag.toUpperCase()} · {t.count}
                        </Chip>
                      ))}
                    </div>
                  </>
                )}
                {feedback.recentComments.length > 0 && (
                  <>
                    <div
                      className="w-type-meta"
                      style={{ marginBottom: 8 }}
                    >
                      RECENT COMMENTS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {feedback.recentComments.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            borderLeft: "2px solid var(--w-acc)",
                            paddingLeft: 12,
                            paddingTop: 4,
                            paddingBottom: 4,
                          }}
                        >
                          <div
                            className="w-type-meta"
                            style={{ marginBottom: 4 }}
                          >
                            {"★".repeat(c.rating)}
                            <span style={{ color: "var(--w-fg-muted)" }}>
                              {"★".repeat(5 - c.rating)}
                            </span>
                          </div>
                          <p
                            style={{
                              color: "var(--w-fg)",
                              opacity: 0.85,
                              fontSize: 14,
                              lineHeight: 1.5,
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Link
                href={`/owner/events/${event.id}/export`}
                style={{ textDecoration: "none" }}
              >
                <Button variant="ghost" style={{ width: "100%" }}>
                  Export CSV
                </Button>
              </Link>
              <Link
                href={`/owner/events/${event.id}/print`}
                style={{ textDecoration: "none" }}
              >
                <Button variant="ghost" style={{ width: "100%" }}>
                  Print roster
                </Button>
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
      ? "var(--w-ok)"
      : tone === "muted"
        ? "var(--w-fg-muted)"
        : "var(--w-fg)";
  return (
    <div>
      <div className="w-type-meta">{label}</div>
      <div
        style={{
          fontFamily: "var(--w-display)",
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          marginTop: 6,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
