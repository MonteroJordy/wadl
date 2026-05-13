import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { getVapidPublicKey } from "@/lib/push";
import PushSubscribeButton from "@/components/push-subscribe";
import { Avatar, Button, Chip, IconPlus } from "@/components/wadl";
import FormSubmit from "@/components/form-submit";
import AccountMetaForm from "./account-meta-form";
import ShareLinkInput from "./share-link";

export const dynamic = "force-dynamic";

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
      ? "VENUE"
      : account.account_type === "brand"
        ? "BRAND"
        : "INDIVIDUAL";

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
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <Avatar name={profile.full_name ?? "Owner"} size={56} accent />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="w-type-meta">PROFILE</div>
            <div className="w-type-display-md" style={{ marginTop: 4 }}>
              {profile.full_name ?? "Owner"}
            </div>
            <div className="w-type-meta" style={{ marginTop: 6 }}>
              {profile.phone ?? "no phone on file"}
            </div>
          </div>
        </div>

        {/* Account card */}
        <section
          className="w-card"
          style={{ padding: 18, marginTop: 24 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="w-type-meta">ACCOUNT</div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 18,
                  marginTop: 4,
                }}
              >
                {account.display_name}
              </div>
            </div>
            <Chip tone="acc">{accountTypeLabel}</Chip>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {profile.email && (
              <div>
                <div className="w-type-meta">EMAIL</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {profile.email}
                </div>
              </div>
            )}
            {account.handle && (
              <div>
                <div className="w-type-meta">HANDLE</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  @{account.handle}
                </div>
              </div>
            )}
            {account.city && (
              <div>
                <div className="w-type-meta">CITY</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {account.city}
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          className="w-card"
          style={{ padding: 18, marginTop: 12 }}
        >
          <div className="w-type-meta">EDIT HANDLE + CITY</div>
          <div style={{ marginTop: 12 }}>
            <AccountMetaForm
              initialHandle={account.handle ?? null}
              initialCity={account.city ?? null}
            />
          </div>
        </section>

        {/* Venues */}
        <section
          className="w-card"
          style={{ padding: 18, marginTop: 12 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div className="w-type-meta">
              VENUES · {venues.length}
            </div>
            <Link
              href="/venuesetup"
              className="w-type-meta"
              style={{
                color: "var(--w-acc)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconPlus size={12} /> ADD
            </Link>
          </div>
          {venues.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
              }}
            >
              No venue yet — add one to start scheduling events.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {venues.map((v) => (
                <li
                  key={v.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    paddingTop: 10,
                    borderTop: "1px solid var(--w-line)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {v.name}
                    </div>
                    <div className="w-type-meta" style={{ marginTop: 4 }}>
                      {v.city || "—"}
                      {v.default_capacity && ` · CAP ${v.default_capacity}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Team */}
        <section
          className="w-card"
          style={{ padding: 18, marginTop: 12 }}
        >
          <div className="w-type-meta">
            TEAM · DOOR STAFF & MANAGERS · {team.length}
          </div>
          {team.length === 0 ? (
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 12,
              }}
            >
              No staff invited yet. Add staff per-event from any
              event&apos;s Staff page.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {team.map((m, i) => (
                <li
                  key={m.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--w-line)",
                  }}
                >
                  <Avatar name={m.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      className="w-type-meta"
                      style={{
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.phone ?? "no phone"}
                    </div>
                  </div>
                  <Chip tone={m.role === "door_manager" ? "warn" : "ok"}>
                    {m.role === "door_manager" ? "MGR" : "STAFF"}
                  </Chip>
                  <span
                    className="w-type-meta"
                    style={{
                      whiteSpace: "nowrap",
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {m.events.length === 1
                      ? m.events[0]
                      : `${m.events.length} EVENTS`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Push */}
        <section style={{ marginTop: 12 }}>
          <PushSubscribeButton vapidPublicKey={getVapidPublicKey()} />
        </section>

        {/* Share link */}
        <section
          className="w-card"
          style={{ padding: 18, marginTop: 12 }}
        >
          <div className="w-type-meta">SHARE WITH VENUES</div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            Send this link to anyone you want to invite to the platform.
          </p>
          <ShareLinkInput url={getAppUrl()} />
        </section>

        {/* Security shortcut */}
        <section style={{ marginTop: 12 }}>
          <Link
            href="/owner/profile/security"
            style={{ textDecoration: "none" }}
          >
            <div
              className="w-card"
              style={{
                padding: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div className="w-type-meta">SECURITY</div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    marginTop: 4,
                  }}
                >
                  Two-factor auth + recovery codes
                </div>
              </div>
              <span style={{ color: "var(--w-fg-dim)" }}>→</span>
            </div>
          </Link>
        </section>

        {/* Danger zone */}
        <section
          className="w-card"
          style={{
            padding: 18,
            marginTop: 12,
            borderColor: "var(--w-err)",
          }}
        >
          <Chip tone="err">DANGER ZONE</Chip>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 12,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Deleting your account is permanent and removes all events,
            allocations, and guest data. Contact{" "}
            <a
              href="mailto:jmontero@mainframeagency.com"
              style={{
                color: "var(--w-acc)",
                textDecoration: "underline",
              }}
            >
              support
            </a>{" "}
            to request deletion.
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled
            title="Stub — contact support"
            style={{
              borderColor: "var(--w-err)",
              color: "var(--w-err)",
            }}
          >
            Delete account (request)
          </Button>
        </section>

        {/* Sign out */}
        <form action="/api/auth/signout" method="post" style={{ marginTop: 24 }}>
          <FormSubmit variant="ghost" block pendingLabel="Signing out…">
            Sign out
          </FormSubmit>
        </form>

        {!profile.full_name && (
          <div
            className="w-card"
            style={{
              padding: "32px 24px",
              textAlign: "center",
              marginTop: 16,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <Chip tone="acc">PROFILE INCOMPLETE</Chip>
            <div className="w-type-h2" style={{ marginTop: 8 }}>
              Finish onboarding
            </div>
            <p
              className="w-type-body-sm"
              style={{
                marginTop: 8,
              }}
            >
              Complete signup to unlock the rest of the dashboard.
            </p>
            <Link
              href="/signup"
              className="w-btn w-btn--primary"
              style={{
                marginTop: 16,
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
