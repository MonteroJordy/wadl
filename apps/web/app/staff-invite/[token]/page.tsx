import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";
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
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <Logo size={18} />
      </div>
      <div
        style={{
          padding: "var(--s-24) var(--s-6) 0",
          textAlign: "center",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        <div className="t-meta">Staff invite</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          {title}
        </div>
        <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          {body}
        </p>
        {cta ?? (
          <p className="t-meta" style={{ marginTop: "var(--s-7)" }}>
            Need help?{" "}
            <a
              href="mailto:support@wadlwadl.com"
              style={{ color: "var(--fg)", textDecoration: "none" }}
            >
              Email support
            </a>
          </p>
        )}
      </div>
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
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div
        style={{
          padding: "var(--s-6) var(--s-6) 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={18} />
        <span className="chip chip--solid">Staff · role invite</span>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <div className="t-meta">{invite.event.name}</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          Working the door.
        </div>
      </div>

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div
          className="card"
          style={{ padding: "var(--s-5)", borderColor: "var(--fg)" }}
        >
          <div className="t-meta">Your role</div>
          <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
            {roleLabel}
          </div>
          <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
            {invite.role === "door_manager"
              ? "Manage the list, override scans, run the door for the night."
              : invite.role === "photographer"
                ? "Upload to the post-event gallery. Read-only on guest data."
                : "Scan QR codes and search by name. Manager handles overrides."}
          </p>
        </div>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <InviteAcceptForm
          token={params.token}
          invitePhone={invite.phone}
          eventName={invite.event.name}
          role={invite.role}
          alreadyAuthedPhone={user?.phone ?? null}
        />
      </div>

      <div
        className="t-meta"
        style={{
          paddingTop: "var(--s-8)",
          paddingBottom: "var(--s-4)",
          textAlign: "center",
        }}
      >
        Need help?{" "}
        <Link
          href="/discover"
          style={{ color: "var(--fg)", textDecoration: "none" }}
        >
          WADL home
        </Link>
      </div>
    </main>
  );
}
