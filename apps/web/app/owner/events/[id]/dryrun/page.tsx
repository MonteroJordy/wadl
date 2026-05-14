import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
import DryRunControls from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dry run — WADL" };

export default async function DryRunPage({
  params,
}: {
  params: { id: string };
}) {
  const { account } = await requireOwnerContext();
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, name, account_id, event_nights(id, capacity_cap)")
    .eq("id", params.id)
    .maybeSingle<{
      id: string;
      name: string;
      account_id: string;
      event_nights: Array<{ id: string; capacity_cap: number | null }>;
    }>();
  if (!event || event.account_id !== account.id) notFound();

  const nightIds = event.event_nights.map((n) => n.id);
  const totalCap = event.event_nights.reduce(
    (s, n) => s + (n.capacity_cap ?? 0),
    0,
  );

  let existingCount = 0;
  if (nightIds.length > 0) {
    const { count } = await admin
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("notes", "DRYRUN")
      .in("event_night_id", nightIds);
    existingCount = count ?? 0;
  }

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Dry run",
        ]}
      />
      <PageHeader
        eyebrow="Dry run"
        title="Dry run"
        sub="Stress-test the daydash, queue, recap, and SMS log without burning a real Friday. Seeds DRYRUN-flagged guests with realistic distribution. Optional check-in simulation jitters scans across the 2h after doors."
      />
      <EventSubNav active="overview" eventId={event.id} />

      <div style={{ padding: "var(--s-8)", maxWidth: 880 }}>
        <section
          className="card"
          style={{ padding: "var(--s-5)", marginBottom: "var(--s-3)" }}
        >
          <div className="t-meta" style={{ marginBottom: "var(--s-4)" }}>
            Current state
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "var(--s-4)",
            }}
          >
            <DryStat label="DRYRUN guests" value={existingCount} />
            <DryStat
              label={`Night${event.event_nights.length === 1 ? "" : "s"}`}
              value={event.event_nights.length}
            />
            <DryStat label="Total cap" value={totalCap || "—"} />
          </div>
        </section>

        <DryRunControls eventId={event.id} existingCount={existingCount} />

        <section
          className="card"
          style={{ padding: "var(--s-5)", marginTop: "var(--s-3)" }}
        >
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            What this populates
          </div>
          <ul
            className="t-body-2"
            style={{
              lineHeight: 1.7,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <Bullet>
              <strong style={{ color: "var(--fg)" }}>Daydash hero stats</strong>{" "}
              — In/Pending/RSVPs counters move with realistic numbers.
            </Bullet>
            <Bullet>
              <strong style={{ color: "var(--fg)" }}>Capacity ETA</strong> —
              recent-30-minute scan rate becomes nonzero, the projected-at-cap
              pill activates.
            </Bullet>
            <Bullet>
              <strong style={{ color: "var(--fg)" }}>Approval queue</strong> —
              the pending bucket has things to approve.
            </Bullet>
            <Bullet>
              <strong style={{ color: "var(--fg)" }}>Top holders</strong> — if
              you have allocations, simulated guests roll up to them.
            </Bullet>
            <Bullet>
              <strong style={{ color: "var(--fg)" }}>Recap</strong> — show rate,
              tier breakdown, top-holder ranking all populate.
            </Bullet>
            <Bullet>
              <strong style={{ color: "var(--fg)" }}>
                Hour velocity chart
              </strong>{" "}
              — arrival distribution renders properly.
            </Bullet>
          </ul>
        </section>

        <section
          className="card"
          style={{
            padding: "var(--s-5)",
            marginTop: "var(--s-3)",
            borderColor: "var(--err)",
          }}
        >
          <div
            className="t-meta"
            style={{ color: "var(--err)", marginBottom: "var(--s-3)" }}
          >
            What it doesn&apos;t do
          </div>
          <ul
            className="t-body-2"
            style={{
              lineHeight: 1.7,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <Bullet>
              No real SMS goes out — phones are +1555 placeholder numbers.
            </Bullet>
            <Bullet>No webhooks fire to integrations.</Bullet>
            <Bullet>
              No notifications get pushed (the Supabase Realtime bell stays
              quiet).
            </Bullet>
            <Bullet>
              Cleanup deletes every guest tagged{" "}
              <code
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "var(--ts-sm)",
                  color: "var(--fg)",
                }}
              >
                notes = &quot;DRYRUN&quot;
              </code>{" "}
              on this event&apos;s nights — leaves real guests intact.
            </Bullet>
          </ul>
        </section>
      </div>
    </main>
  );
}

function DryStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <div className="t-display-md t-num">{value}</div>
      <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
        {label}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        paddingLeft: "var(--s-5)",
        position: "relative",
        marginBottom: "var(--s-2)",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          color: "var(--fg-4)",
        }}
      >
        ·
      </span>
      {children}
    </li>
  );
}
