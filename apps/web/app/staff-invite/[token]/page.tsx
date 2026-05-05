import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Chip, WFrame, Wordmark } from "@/components/wadl";
import InviteAcceptForm from "./form";

export const dynamic = "force-dynamic";

interface InviteLookup {
  id: string;
  phone: string;
  role: "door_staff" | "door_manager" | "photographer";
  used_at: string | null;
  expires_at: string | null;
  event: { id: string; name: string };
}

function Shell({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>
        <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
          <div className="w-type-meta">STAFF INVITE</div>
          <div className="w-type-display-md" style={{ marginTop: 12 }}>
            {title}
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 12 }}
          >
            {body}
          </p>
          {cta}
        </div>
      </WFrame>
    </main>
  );
}

export default async function StaffInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("staff_invites")
    .select(
      "id, phone, role, used_at, expires_at, event:events!inner(id, name)",
    )
    .eq("token", params.token)
    .maybeSingle<InviteLookup>();

  if (!invite) {
    return (
      <Shell
        title="Invite not found."
        body="The link may be wrong — check the SMS you received."
      />
    );
  }
  if (invite.used_at) {
    return (
      <Shell
        title="Already used."
        body="This invite has already been claimed. If that wasn't you, contact the event owner."
      />
    );
  }
  if (
    invite.expires_at &&
    new Date(invite.expires_at).getTime() < Date.now()
  ) {
    return <Shell title="Expired." body="Ask for a fresh invite link." />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roleLabel =
    invite.role === "door_manager"
      ? "Door manager"
      : invite.role === "photographer"
        ? "Photographer"
        : "Door staff";

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark variant="monogrid" size={18} />
          <Chip tone="acc">STAFF · ROLE INVITE</Chip>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">
            {invite.event.name.toUpperCase()}
          </div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            Working the door.
          </div>
        </div>

        <div style={{ padding: "24px 24px 0" }}>
          <div
            className="w-card"
            style={{
              padding: 18,
              borderColor: "var(--w-acc)",
              background: "var(--w-acc-soft)",
            }}
          >
            <div className="w-type-meta">YOUR ROLE</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 17,
                marginTop: 6,
              }}
            >
              {roleLabel}
            </div>
            <p
              className="w-type-body-sm"
              style={{ marginTop: 8 }}
            >
              {invite.role === "door_manager"
                ? "Manage the list, override scans, run the door for the night."
                : invite.role === "photographer"
                  ? "Upload to the post-event gallery. Read-only on guest data."
                  : "Scan QR codes and search by name. Manager handles overrides."}
            </p>
          </div>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <InviteAcceptForm
            token={params.token}
            invitePhone={invite.phone}
            eventName={invite.event.name}
            role={invite.role}
            alreadyAuthedPhone={user?.phone ?? null}
          />
        </div>

        <div
          className="w-type-meta"
          style={{
            marginTop: "auto",
            paddingTop: 32,
            paddingBottom: 16,
            textAlign: "center",
            color: "var(--w-fg-dim)",
          }}
        >
          NEED HELP?{" "}
          <Link
            href="/discover"
            style={{ color: "var(--w-acc)", textDecoration: "none" }}
          >
            WADL HOME
          </Link>
        </div>
      </WFrame>
    </main>
  );
}
