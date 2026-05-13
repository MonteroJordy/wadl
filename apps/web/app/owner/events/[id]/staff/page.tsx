import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { Avatar, Chip } from "@/components/wadl";
import InviteForm from "./invite-form";
import {
  CopyLinkButton,
  RevokeInviteButton,
  RemoveStaffButton,
} from "./row-buttons";

export const dynamic = "force-dynamic";

interface StaffRow {
  user_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
  };
}

interface InviteRow {
  id: string;
  phone: string;
  role: string;
  token: string;
  created_at: string;
}

function roleTone(role: string): "warn" | "ok" | "acc" | "ghost" {
  if (role === "door_manager") return "warn";
  if (role === "door_staff") return "ok";
  if (role === "photographer") return "acc";
  return "ghost";
}

function roleLabel(role: string) {
  if (role === "door_manager") return "MANAGER";
  if (role === "door_staff") return "STAFF";
  if (role === "photographer") return "PHOTOGRAPHER";
  return role.toUpperCase();
}

export default async function StaffPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, account } = await requireOwnerContext();
  const admin = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, account_id")
    .eq("id", params.id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!event) notFound();

  const [staffRes, invitesRes] = await Promise.all([
    admin
      .from("event_staff")
      .select("user_id, role, profile:profiles!inner(id, full_name, phone)")
      .eq("event_id", event.id),
    admin
      .from("staff_invites")
      .select("id, phone, role, token, created_at")
      .eq("event_id", event.id)
      .is("used_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const staff = (staffRes.data ?? []) as unknown as StaffRow[];
  const invites = (invitesRes.data ?? []) as InviteRow[];

  const appUrl = getAppUrl();

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
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{ textDecoration: "none" }}
        >
          ← {event.name.toUpperCase()}
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginTop: 16,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="w-type-meta">DOOR STAFF</div>
            <div className="w-type-display-md" style={{ marginTop: 8 }}>
              Roster
            </div>
            <p
              className="w-type-body-sm"
              style={{
                color: "var(--w-fg-muted)",
                marginTop: 8,
              }}
            >
              {staff.length} on · {invites.length} pending
            </p>
          </div>
        </div>

        {/* Invite form */}
        <div style={{ marginTop: 24 }}>
          <InviteForm eventId={event.id} />
        </div>

        {/* Active staff */}
        <section style={{ marginTop: 32 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            STAFF ON THIS EVENT · {staff.length}
          </div>
          {staff.length === 0 ? (
            <div
              className="w-card"
              style={{
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <div className="w-type-h2">No staff yet</div>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
                }}
              >
                Invite someone above to put them on the scanner tonight.
              </p>
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {staff.map((s) => (
                <li key={s.user_id}>
                  <div
                    className="w-card"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Avatar
                      name={s.profile?.full_name ?? "?"}
                      size={36}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.profile?.full_name ?? "Unnamed"}
                      </div>
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        {s.profile?.phone ?? "NO PHONE"}
                      </div>
                    </div>
                    <Chip tone={roleTone(s.role)}>
                      {roleLabel(s.role)}
                    </Chip>
                    <RemoveStaffButton
                      eventId={event.id}
                      userId={s.user_id}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending invites */}
        {invites.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div className="w-type-meta" style={{ marginBottom: 12 }}>
              PENDING INVITES · {invites.length}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {invites.map((i) => (
                <li key={i.id}>
                  <div
                    className="w-card"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderColor: "var(--w-warn)",
                      background: "oklch(0.86 0.16 85 / 0.06)",
                    }}
                  >
                    <Chip tone="warn">PENDING</Chip>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--w-mono)",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {i.phone}
                      </div>
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        {roleLabel(i.role)}
                      </div>
                    </div>
                    <CopyLinkButton
                      url={`${appUrl}/staff-invite/${i.token}`}
                    />
                    <RevokeInviteButton
                      eventId={event.id}
                      inviteId={i.id}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
