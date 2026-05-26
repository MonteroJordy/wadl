import Link from "next/link";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Stat } from "@/components/v5";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holders — WADL" };

interface AllocRow {
  id: string;
  holder_name: string;
  holder_phone: string | null;
  holder_email: string | null;
  cap: number;
  event_night: {
    night_date: string;
    doors_at: string;
    event: { id: string; name: string; account_id: string };
  };
  guests: Array<{
    status: string;
    plus_ones: number;
    check_ins: Array<{ state: string }>;
  }>;
}

interface HolderAgg {
  key: string;
  display_name: string;
  events: Set<string>;
  approved: number;
  scanned: number;
  cap_total: number;
  most_recent_at: string;
  phones: Set<string>;
  emails: Set<string>;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function HoldersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { account } = await requireOwnerContext();
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from("allocations")
    .select(
      "id, holder_name, holder_phone, holder_email, cap, " +
        "event_night:event_nights!inner(night_date, doors_at, event:events!inner(id, name, account_id)), " +
        "guests(status, plus_ones, check_ins(state))",
    );
  const rows = ((rowsRaw ?? []) as unknown as AllocRow[]).filter(
    (r) => r.event_night.event.account_id === account.id,
  );

  const byKey = new Map<string, HolderAgg>();
  for (const r of rows) {
    const key = r.holder_name.toLowerCase().trim();
    if (q && !key.includes(q)) continue;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        display_name: r.holder_name,
        events: new Set(),
        approved: 0,
        scanned: 0,
        cap_total: 0,
        most_recent_at: r.event_night.doors_at,
        phones: new Set(),
        emails: new Set(),
      });
    }
    const h = byKey.get(key)!;
    h.events.add(r.event_night.event.id);
    h.cap_total += r.cap;
    if (r.holder_phone) h.phones.add(r.holder_phone);
    if (r.holder_email) h.emails.add(r.holder_email);
    if (r.event_night.doors_at > h.most_recent_at)
      h.most_recent_at = r.event_night.doors_at;
    for (const g of r.guests ?? []) {
      if (g.status !== "approved") continue;
      const heads = 1 + (g.plus_ones ?? 0);
      h.approved += heads;
      if (g.check_ins.some((c) => c.state === "approved")) h.scanned += heads;
    }
  }

  const holders = [...byKey.values()].sort((a, b) =>
    a.most_recent_at < b.most_recent_at ? 1 : -1,
  );

  // Aggregate summary across visible holders
  const totalApproved = holders.reduce((s, h) => s + h.approved, 0);
  const totalScanned = holders.reduce((s, h) => s + h.scanned, 0);
  const totalCap = holders.reduce((s, h) => s + h.cap_total, 0);
  const aggShowRate =
    totalApproved === 0 ? 0 : Math.round((totalScanned / totalApproved) * 100);

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="People who bring nights"
        title="Promoters"
        sub={`${holders.length} unique promoter${
          holders.length === 1 ? "" : "s"
        } across this account · ranked by show rate`}
        actions={
          <Link href="/owner" className="btn btn--ghost">
            ← Events
          </Link>
        }
      />

      {/* Aggregate KPI — show rate gets primary prominence */}
      {holders.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Stat
            label="Show rate"
            value={`${aggShowRate}%`}
            sub={`${totalScanned} scanned in · the ROI proof`}
          />
          <Stat
            label="Holders"
            value={holders.length}
            sub="active across this account"
          />
          <Stat
            label="Heads delivered"
            value={totalApproved}
            sub={`of ${totalCap} cap`}
            last
          />
        </div>
      )}

      <div style={{ padding: "var(--s-8)" }}>
        {/* Search */}
        <form action="/owner/holders" method="get">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by holder name…"
            className="input"
            style={{ maxWidth: 320 }}
          />
        </form>

        {/* List */}
        {holders.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "var(--s-16) var(--s-8)",
              textAlign: "center",
              marginTop: "var(--s-6)",
            }}
          >
            <div className="t-display-sm">No promoters yet</div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-3)",
                maxWidth: 440,
                marginInline: "auto",
              }}
            >
              Open an event, hand a promoter a list, send them their magic
              link. Their show rate (how many of their RSVPs actually scanned
              in) starts ranking here after their first night.
            </p>
            <Link
              href="/owner"
              className="btn btn--accent"
              style={{ marginTop: "var(--s-6)" }}
            >
              Back to events
            </Link>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "var(--s-5) 0 0",
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
            }}
          >
            {holders.map((h) => {
              const showRate =
                h.approved === 0
                  ? 0
                  : Math.round((h.scanned / h.approved) * 100);
              const showRateColor =
                showRate >= 80
                  ? "var(--ok)"
                  : showRate >= 60
                    ? "var(--fg)"
                    : "var(--warn)";
              const fillPct =
                h.cap_total > 0
                  ? Math.min(100, (h.scanned / h.cap_total) * 100)
                  : 0;
              return (
                <li key={h.key}>
                  <Link
                    href={`/owner/scorecards/${encodeURIComponent(h.key)}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      className="card card--hover"
                      style={{
                        padding: "var(--s-5)",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--s-4)",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: "var(--r-pill)",
                          background: "var(--bg-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--display)",
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--fg-2)",
                        }}
                      >
                        {initials(h.display_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="t-h1 truncate">{h.display_name}</div>
                        <div
                          className="t-meta"
                          style={{ marginTop: "var(--s-1)" }}
                        >
                          {h.events.size} event
                          {h.events.size === 1 ? "" : "s"} · cap {h.cap_total} ·
                          last {fmtDate(h.most_recent_at)}
                        </div>
                        {h.cap_total > 0 && (
                          <div
                            style={{
                              marginTop: "var(--s-2)",
                              maxWidth: 280,
                              height: 6,
                              background: "var(--bg-3)",
                              borderRadius: "var(--r-pill)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${fillPct}%`,
                                height: "100%",
                                background: "var(--fg)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          flexShrink: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "var(--s-1)",
                        }}
                      >
                        <div
                          className="t-display-sm t-num"
                          style={{ color: showRateColor }}
                        >
                          {showRate}%
                        </div>
                        <div className="t-meta">
                          {h.scanned}/{h.approved}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
