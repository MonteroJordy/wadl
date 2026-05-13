import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDate, fmtTime } from "@/lib/format";
import { nextOnboardingStep } from "@/lib/routing";
import type { Account, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose your role tonight — WADL" };

/**
 * Day 27 — dualctx context switcher.
 *
 * Same-person-two-roles edge case: an owner who is ALSO assigned as
 * door staff or door manager for tonight's event needs to pick which
 * surface they want at signin. Without this, the root router would
 * always pick the owner dashboard, and the founder-as-door-staff case
 * never gets the staff scanner.
 *
 * This route is reachable when:
 *   - The signed-in user has profile.role === "owner"
 *   - AND there's at least one event_staff row for an event_night
 *     happening today (doors_at within ±18 hours of now).
 *
 * Otherwise we redirect to the standard onboarding router.
 */

interface StaffShift {
  event_id: string;
  role: "door_staff" | "door_manager";
  event_name: string;
  doors_at: string;
  night_id: string;
  night_date: string;
}

export default async function DualCtxPage({
  searchParams,
}: {
  searchParams: { force?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) redirect("/signup");

  // Guests never hit this page.
  if (profile.role === "guest") redirect("/mytickets");

  const admin = createAdminClient();

  // Tonight ± 18h. Picks up afternoon load-in shifts and post-doors close-out.
  const now = Date.now();
  const start = new Date(now - 18 * 60 * 60 * 1000).toISOString();
  const end = new Date(now + 18 * 60 * 60 * 1000).toISOString();

  const { data: shiftRows } = await admin
    .from("event_staff")
    .select(
      "event_id, role, event:events!inner(id, name, event_nights!inner(id, night_date, doors_at))"
    )
    .eq("user_id", user.id)
    .in("role", ["door_staff", "door_manager"])
    .gte("event.event_nights.doors_at", start)
    .lte("event.event_nights.doors_at", end);

  type RawShift = {
    event_id: string;
    role: "door_staff" | "door_manager";
    event: {
      id: string;
      name: string;
      event_nights: Array<{ id: string; night_date: string; doors_at: string }>;
    };
  };

  const shifts: StaffShift[] = ((shiftRows ?? []) as unknown as RawShift[])
    .flatMap((r) =>
      r.event.event_nights.map((n) => ({
        event_id: r.event_id,
        role: r.role,
        event_name: r.event.name,
        doors_at: n.doors_at,
        night_id: n.id,
        night_date: n.night_date,
      }))
    )
    .sort((a, b) => (a.doors_at < b.doors_at ? -1 : 1));

  // No shifts tonight + not forced → onboarding router.
  if (shifts.length === 0 && !searchParams.force) {
    let account: Account | null = null;
    if (profile.account_id) {
      const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", profile.account_id)
        .maybeSingle<Account>();
      account = data;
    }
    let hasVenue = false;
    if (account?.account_type === "venue") {
      const { count } = await supabase
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);
      hasVenue = (count ?? 0) > 0;
    }
    redirect(nextOnboardingStep(profile, account, hasVenue));
  }

  const isOwner = profile.role === "owner" || !!profile.account_id;
  const primaryShift = shifts[0];

  const cardLink: React.CSSProperties = {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  };

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
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <header style={{ paddingTop: 48, paddingBottom: 32 }}>
          <div className="w-type-meta" style={{ marginBottom: 8 }}>
            TONIGHT
          </div>
          <div className="w-type-display-md">Where are you working?</div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            You&apos;re booked as both an owner and door staff. Pick the
            surface you want now — you can switch any time.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isOwner && (
            <Link
              href="/owner"
              className="w-card"
              style={{ ...cardLink, padding: 16 }}
            >
              <div
                className="w-type-meta"
                style={{ marginBottom: 4, color: "var(--w-acc)" }}
              >
                OWNER
              </div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--w-fg)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                }}
              >
                Run the show
              </div>
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
              >
                Approvals, allocations, capacity, analytics. Full access.
              </p>
            </Link>
          )}

          {primaryShift && (
            <Link
              href={
                primaryShift.role === "door_manager" ? "/manager" : "/door"
              }
              className="w-card"
              style={{ ...cardLink, padding: 16 }}
            >
              <div
                className="w-type-meta"
                style={{ marginBottom: 4, color: "var(--w-ok)" }}
              >
                {primaryShift.role === "door_manager"
                  ? "DOOR MANAGER"
                  : "DOOR STAFF"}
              </div>
              <div
                style={{
                  fontFamily: "var(--w-display)",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "var(--w-fg)",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                }}
              >
                Work the door
              </div>
              <p
                className="w-type-body-sm"
                style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
              >
                {primaryShift.event_name} ·{" "}
                {fmtDate(primaryShift.night_date)} · doors{" "}
                {fmtTime(primaryShift.doors_at)}
              </p>
              {shifts.length > 1 && (
                <div
                  className="w-type-meta"
                  style={{ marginTop: 8, color: "var(--w-ok)" }}
                >
                  + {shifts.length - 1} MORE SHIFT
                  {shifts.length === 2 ? "" : "S"} TONIGHT
                </div>
              )}
            </Link>
          )}

          <Link
            href="/mytickets"
            className="w-card"
            style={{ ...cardLink, padding: 16 }}
          >
            <div
              className="w-type-meta"
              style={{ marginBottom: 4, color: "var(--w-fg-muted)" }}
            >
              GUEST
            </div>
            <div
              style={{
                fontFamily: "var(--w-display)",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--w-fg)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                lineHeight: 1.1,
              }}
            >
              My tickets
            </div>
            <p
              className="w-type-body-sm"
              style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
            >
              View your own RSVPs and QRs.
            </p>
          </Link>
        </div>

        <div
          className="w-type-meta"
          style={{ marginTop: 32, textAlign: "center" }}
        >
          PICK ONCE · SWITCH VIA THE SIDEBAR LATER
        </div>
      </div>
    </main>
  );
}
