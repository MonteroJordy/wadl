import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Cover, Logo } from "@/components/v5";
import { fmtDate, fmtTime } from "@/lib/format";
import { acceptInviteAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invite — WADL" };

interface PageProps {
  params: { token: string };
}

type InviteKind = "staff" | "co_owner" | "guest";

interface ResolvedInvite {
  kind: InviteKind;
  inviteeLabel: string;
  eventName: string;
  eventDate?: string;
  eventDoors?: string;
  roleLabel: string;
  subLine?: string;
}

async function resolveInvite(
  supabase: ReturnType<typeof createAdminClient>,
  token: string,
): Promise<ResolvedInvite | null> {
  // 1. staff_invites
  const { data: staff } = await supabase
    .from("staff_invites")
    .select(
      "phone, role, event:events ( id, name )",
    )
    .eq("token", token)
    .maybeSingle();
  if (staff) {
    const ev = Array.isArray(staff.event) ? staff.event[0] : staff.event;
    return {
      kind: "staff",
      inviteeLabel: staff.phone ?? "Staff",
      eventName: ev?.name ?? "Event",
      roleLabel:
        staff.role === "door_manager" ? "Door manager" : "Scanner · door",
    };
  }

  // 2. co_owner_invites
  const { data: co } = await supabase
    .from("co_owner_invites")
    .select(
      "invitee_email, invitee_phone, permission, event:events ( id, name )",
    )
    .eq("token", token)
    .maybeSingle();
  if (co) {
    const ev = Array.isArray(co.event) ? co.event[0] : co.event;
    return {
      kind: "co_owner",
      inviteeLabel: co.invitee_email ?? co.invitee_phone ?? "Co-host",
      eventName: ev?.name ?? "Event",
      roleLabel: `Co-host · ${co.permission}`,
    };
  }

  // 3. allocations.magic_link_token → generic guest invite
  const { data: alloc } = await supabase
    .from("allocations")
    .select(
      "holder_name, guestless, event_night_id",
    )
    .eq("magic_link_token", token)
    .maybeSingle();
  if (alloc) {
    if (alloc.guestless) {
      // guestless lives at /g/[token] — bounce there
      return null;
    }
    const { data: night } = await supabase
      .from("event_nights")
      .select(
        "night_date, doors_at, event:events ( name )",
      )
      .eq("id", alloc.event_night_id)
      .maybeSingle();
    const ev = Array.isArray(night?.event) ? night?.event[0] : night?.event;
    return {
      kind: "guest",
      inviteeLabel: alloc.holder_name,
      eventName: ev?.name ?? "Event",
      eventDate: night?.night_date,
      eventDoors: night?.doors_at,
      roleLabel: "Guest",
      subLine: `Invited by ${alloc.holder_name}`,
    };
  }

  return null;
}

export default async function InviteLanding({ params }: PageProps) {
  const supabase = createAdminClient();
  const invite = await resolveInvite(supabase, params.token);

  // If it's a guestless allocation, the real route is /g/{token}.
  if (!invite) {
    const { data: alloc } = await supabase
      .from("allocations")
      .select("guestless")
      .eq("magic_link_token", params.token)
      .maybeSingle();
    if (alloc?.guestless) {
      const { redirect } = await import("next/navigation");
      redirect(`/g/${params.token}`);
    }
    notFound();
  }

  const accept = acceptInviteAction.bind(null, params.token);

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: "var(--s-5)", borderBottom: "1px solid var(--line)" }}>
        <Logo size={20} />
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-5)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        {/* Cover for guest invites, plain header for staff/co-owner */}
        {invite.kind === "guest" ? (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ position: "relative", height: 280 }}>
              <Cover seed={invite.eventName} height={280} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "var(--s-5)",
                  right: "var(--s-5)",
                  bottom: "var(--s-5)",
                }}
              >
                <div className="t-meta" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {invite.eventDate ? fmtDate(invite.eventDate) : ""}
                  {invite.eventDoors ? ` · ${fmtTime(invite.eventDoors)}` : ""}
                </div>
                <div className="t-display-sm" style={{ marginTop: "var(--s-2)", color: "#fff" }}>
                  {invite.eventName}
                </div>
              </div>
            </div>
            <div style={{ padding: "var(--s-5)" }}>
              <span className="chip">{invite.roleLabel}</span>
              <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
                {invite.subLine}
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: "var(--s-5)" }}>
            <span className="chip">
              {invite.kind === "staff" ? "Staff invite" : "Co-host invite"}
            </span>
            <h1 className="t-display-sm" style={{ marginTop: "var(--s-3)" }}>
              {invite.kind === "staff"
                ? `You're working the door at ${invite.eventName}`
                : `You're invited to co-host ${invite.eventName}`}
            </h1>
            <div className="t-meta" style={{ marginTop: "var(--s-3)" }}>
              Role
            </div>
            <div className="t-h1" style={{ marginTop: "var(--s-1)" }}>
              {invite.roleLabel}
            </div>
          </div>
        )}

        <form action={accept} style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
          <button type="submit" className="btn btn--lg btn--block">
            {invite.kind === "staff"
              ? "Accept shift"
              : invite.kind === "co_owner"
                ? "Accept co-host"
                : "Continue →"}
          </button>
          <button
            type="submit"
            name="decline"
            value="1"
            className="btn btn--ghost btn--block"
          >
            {invite.kind === "staff" ? "Can't make it" : "Decline"}
          </button>
        </form>
      </div>
    </main>
  );
}
