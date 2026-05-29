import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
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

function roleLabel(role: string) {
  if (role === "door_manager") return "Manager";
  if (role === "door_staff") return "Scanner";
  if (role === "photographer") return "Photographer";
  return role.replace(/_/g, " ");
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
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
    <main id="main-content">
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Staff",
        ]}
      />
      <PageHeader
        eyebrow={`${staff.length} staff · all confirmed`}
        title="Staff"
      />
      <EventSubNav active="staff" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        {/* Invite form */}
        <div style={{ marginBottom: "var(--s-8)", maxWidth: 720 }}>
          <InviteForm eventId={event.id} />
        </div>

        {/* Active staff */}
        <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
          On this event · {staff.length}
        </div>
        {staff.length === 0 ? (
          <div
            className="card"
            style={{ padding: "var(--s-10)", textAlign: "center" }}
          >
            <div className="t-h1">No staff yet</div>
            <div className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
              Invite someone above to put them on the scanner tonight.
            </div>
          </div>
        ) : (
          <div className="card">
            {staff.map((s) => (
              <div
                key={s.user_id}
                className="row"
                style={{
                  gridTemplateColumns: "36px 1fr 1fr 140px 100px 24px",
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
                  }}
                >
                  {initials(s.profile?.full_name ?? "?")}
                </div>
                <span className="t-h1">
                  {s.profile?.full_name ?? "Unnamed"}
                </span>
                <span className="t-body-2">{roleLabel(s.role)}</span>
                <span className="t-meta">
                  {s.profile?.phone ?? "No phone"}
                </span>
                <span className="chip chip--ok">Confirmed</span>
                <RemoveStaffButton eventId={event.id} userId={s.user_id} />
              </div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <>
            <div
              className="t-meta"
              style={{
                marginTop: "var(--s-10)",
                marginBottom: "var(--s-3)",
              }}
            >
              Pending invites · {invites.length}
            </div>
            <div className="card">
              {invites.map((i) => (
                <div
                  key={i.id}
                  className="row"
                  style={{
                    gridTemplateColumns: "1fr 1fr 100px auto auto",
                  }}
                >
                  <span className="t-h1">{i.phone}</span>
                  <span className="t-body-2">{roleLabel(i.role)}</span>
                  <span className="chip chip--warn">Pending</span>
                  <CopyLinkButton
                    url={`${appUrl}/staff-invite/${i.token}`}
                  />
                  <RevokeInviteButton
                    eventId={event.id}
                    inviteId={i.id}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
