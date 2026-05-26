import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { getVapidPublicKey } from "@/lib/push";
import PushSubscribeButton from "@/components/push-subscribe";
import FormSubmit from "@/components/form-submit";
import { PageHeader } from "@/components/v5";
import AccountMetaForm from "./account-meta-form";
import ShareLinkInput from "./share-link";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ProfilePage() {
  const { profile, account } = await requireOwnerContext();
  const admin = createAdminClient();

  const [venuesRes, staffRes] = await Promise.all([
    admin
      .from("venues")
      .select("id, name, city, default_capacity, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: true }),
    admin
      .from("event_staff")
      .select(
        "user_id, role, event:events!inner(id, name, account_id), profile:profiles!inner(full_name, phone)",
      )
      .eq("event.account_id", account.id),
  ]);

  const venues = venuesRes.data ?? [];
  const staff = (staffRes.data ?? []) as unknown as Array<{
    user_id: string;
    role: string;
    event: { id: string; name: string };
    profile: { full_name: string | null; phone: string | null };
  }>;

  const teamMap = new Map<
    string,
    {
      user_id: string;
      name: string;
      phone: string | null;
      role: string;
      events: string[];
    }
  >();
  for (const s of staff) {
    const existing = teamMap.get(s.user_id);
    if (existing) {
      existing.events.push(s.event.name);
    } else {
      teamMap.set(s.user_id, {
        user_id: s.user_id,
        name: s.profile.full_name ?? "Unnamed",
        phone: s.profile.phone,
        role: s.role,
        events: [s.event.name],
      });
    }
  }
  const team = [...teamMap.values()];

  const accountTypeLabel =
    account.account_type === "venue"
      ? "Venue"
      : account.account_type === "brand"
        ? "Brand"
        : "Individual";

  const sectionLabel: React.CSSProperties = {
    marginBottom: "var(--s-3)",
  };

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <PageHeader
        eyebrow={`${accountTypeLabel} · ${account.display_name}`}
        title="Profile + venues"
        sub="Your account, venues, and team — defaults all new events inherit."
      />

      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 800,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-6)",
        }}
      >
        {/* Identity */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s-5)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--r-pill)",
              background: "var(--bg-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 500,
              fontFamily: "var(--display)",
            }}
          >
            {initials(profile.full_name ?? "Owner")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-display-sm">
              {profile.full_name ?? "Owner"}
            </div>
            <div className="t-body-2" style={{ marginTop: "var(--s-1)" }}>
              {profile.phone ?? "no phone on file"}
              {profile.email ? ` · ${profile.email}` : ""}
            </div>
          </div>
        </div>

        {/* Account */}
        <div>
          <div className="t-meta" style={sectionLabel}>
            Account
          </div>
          <div className="card" style={{ padding: "var(--s-6)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "var(--s-5)",
              }}
            >
              <div>
                <div className="t-meta">Display name</div>
                <div className="t-h2" style={{ marginTop: "var(--s-1)" }}>
                  {account.display_name}
                </div>
              </div>
              <div>
                <div className="t-meta">Type</div>
                <div style={{ marginTop: "var(--s-1)" }}>
                  <span className="chip">{accountTypeLabel}</span>
                </div>
              </div>
              {account.handle && (
                <div>
                  <div className="t-meta">Handle</div>
                  <div
                    className="t-h2"
                    style={{ marginTop: "var(--s-1)" }}
                  >
                    @{account.handle}
                  </div>
                </div>
              )}
              {account.city && (
                <div>
                  <div className="t-meta">City</div>
                  <div
                    className="t-h2"
                    style={{ marginTop: "var(--s-1)" }}
                  >
                    {account.city}
                  </div>
                </div>
              )}
            </div>
            <div
              className="hr"
              style={{ margin: "var(--s-5) 0" }}
            />
            <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
              Edit handle + city
            </div>
            <AccountMetaForm
              initialHandle={account.handle ?? null}
              initialCity={account.city ?? null}
            />
          </div>
        </div>

        {/* Venues */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "var(--s-3)",
            }}
          >
            <div className="t-meta">Venues · {venues.length}</div>
            <Link
              href="/venuesetup"
              className="btn btn--ghost btn--sm"
              style={{ textDecoration: "none" }}
            >
              + Add
            </Link>
          </div>
          {venues.length === 0 ? (
            <div
              className="card"
              style={{ padding: "var(--s-6)" }}
            >
              <div className="t-body-2">
                No venue yet — add one to start scheduling events.
              </div>
            </div>
          ) : (
            <div className="card">
              {venues.map((v) => (
                <div
                  key={v.id}
                  className="row"
                  style={{ gridTemplateColumns: "1fr 1fr 120px" }}
                >
                  <span className="t-h2 truncate">{v.name}</span>
                  <span className="t-body-2">{v.city || "—"}</span>
                  <span className="t-meta">
                    {v.default_capacity
                      ? `Cap ${v.default_capacity}`
                      : "No cap"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team */}
        <div>
          <div className="t-meta" style={sectionLabel}>
            Team · door staff &amp; managers · {team.length}
          </div>
          {team.length === 0 ? (
            <div
              className="card"
              style={{ padding: "var(--s-6)" }}
            >
              <div className="t-body-2">
                No staff invited yet. Add staff per-event from any
                event&apos;s Staff page.
              </div>
            </div>
          ) : (
            <div className="card">
              {team.map((m) => (
                <div
                  key={m.user_id}
                  className="row"
                  style={{
                    gridTemplateColumns: "36px 1fr 1fr 90px 140px",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--r-pill)",
                      background: "var(--bg-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: "var(--display)",
                    }}
                  >
                    {initials(m.name)}
                  </div>
                  <span className="t-h2 truncate">{m.name}</span>
                  <span className="t-body-2 truncate">
                    {m.phone ?? "no phone"}
                  </span>
                  <span
                    className={
                      "chip " +
                      (m.role === "door_manager"
                        ? "chip--warn"
                        : "chip--ok")
                    }
                  >
                    {m.role === "door_manager" ? "Manager" : "Staff"}
                  </span>
                  <span className="t-meta truncate">
                    {m.events.length === 1
                      ? m.events[0]
                      : `${m.events.length} events`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications + push */}
        <div>
          <div className="t-meta" style={sectionLabel}>
            Notifications
          </div>
          <Link
            href="/owner/profile/notifications"
            className="card card--hover"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--s-4)",
              padding: "var(--s-5)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div>
              <div className="t-h1">Notification preferences</div>
              <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                Channels, per-kind controls, quiet hours
              </div>
            </div>
            <span style={{ color: "var(--fg-3)" }}>→</span>
          </Link>
          <div style={{ marginTop: "var(--s-3)" }}>
            <PushSubscribeButton vapidPublicKey={getVapidPublicKey()} />
          </div>
        </div>

        {/* Share link */}
        <div>
          <div className="t-meta" style={sectionLabel}>
            Share with venues
          </div>
          <div className="card" style={{ padding: "var(--s-6)" }}>
            <p
              className="t-body-2"
              style={{ marginBottom: "var(--s-3)" }}
            >
              Send this link to anyone you want to invite to the platform.
            </p>
            <ShareLinkInput url={getAppUrl()} />
          </div>
        </div>

        {/* Security */}
        <Link
          href="/owner/profile/security"
          className="card card--hover"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--s-4)",
            padding: "var(--s-5)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div>
            <div className="t-h1">Security</div>
            <div className="t-meta" style={{ marginTop: "var(--s-1)" }}>
              Two-factor auth + recovery codes
            </div>
          </div>
          <span style={{ color: "var(--fg-3)" }}>→</span>
        </Link>

        {/* Danger zone */}
        <div>
          <div className="t-meta" style={sectionLabel}>
            Danger zone
          </div>
          <div
            className="card"
            style={{
              padding: "var(--s-5)",
              borderColor: "rgba(248,113,113,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--s-4)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="t-h1" style={{ color: "var(--err)" }}>
                Delete account
              </div>
              <div
                className="t-body-2"
                style={{ marginTop: "var(--s-1)", maxWidth: 460 }}
              >
                Permanent — removes all events, allocations, and guest data.
                Contact{" "}
                <a
                  href="mailto:jmontero@mainframeagency.com"
                  style={{
                    color: "var(--fg)",
                    textDecoration: "underline",
                  }}
                >
                  support
                </a>{" "}
                to request deletion.
              </div>
            </div>
            <button
              type="button"
              className="btn btn--danger"
              disabled
              title="Stub — contact support"
            >
              Delete account
            </button>
          </div>
        </div>

        {/* Sign out */}
        <form action="/api/auth/signout" method="post">
          <FormSubmit variant="ghost" block pendingLabel="Signing out…">
            Sign out
          </FormSubmit>
        </form>

        {!profile.full_name && (
          <div
            className="card"
            style={{
              padding: "var(--s-8)",
              textAlign: "center",
              borderColor: "var(--line-2)",
            }}
          >
            <span className="chip">Profile incomplete</span>
            <div className="t-h1" style={{ marginTop: "var(--s-3)" }}>
              Finish onboarding
            </div>
            <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              Complete signup to unlock the rest of the dashboard.
            </p>
            <Link
              href="/signup"
              className="btn btn--accent"
              style={{
                marginTop: "var(--s-4)",
                textDecoration: "none",
                display: "inline-flex",
              }}
            >
              Complete signup
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
