import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Chip, WFrame, Wordmark } from "@/components/wadl";
import CoOwnerAcceptForm from "./form";

export const dynamic = "force-dynamic";

interface InviteLookup {
  id: string;
  permission: "read_only" | "edit" | "admin";
  used_at: string | null;
  expires_at: string | null;
  event: { id: string; name: string };
}

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>
        <div style={{ padding: "96px 24px 0", textAlign: "center" }}>
          <div className="w-type-meta">CO-OWNER INVITE</div>
          <div className="w-type-display-md" style={{ marginTop: 12 }}>
            {title}
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 12 }}
          >
            {body}
          </p>
          <Link
            href="/discover"
            style={{ textDecoration: "none", marginTop: 24, display: "inline-flex" }}
          >
            <Button variant="ghost">WADL home</Button>
          </Link>
        </div>
      </WFrame>
    </main>
  );
}

export default async function CoOwnerAcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("co_owner_invites")
    .select(
      "id, permission, used_at, expires_at, event:events!inner(id, name)",
    )
    .eq("token", params.token)
    .maybeSingle<InviteLookup>();

  if (!invite) {
    return (
      <Shell title="Invite not found." body="Check the link you were sent." />
    );
  }
  if (invite.used_at) {
    return (
      <Shell title="Already used." body="Ask the host for a fresh invite." />
    );
  }
  if (
    invite.expires_at &&
    new Date(invite.expires_at).getTime() < Date.now()
  ) {
    return (
      <Shell title="Expired." body="Ask the host for a current invite link." />
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const permLabel =
    invite.permission === "admin"
      ? "Admin · full edit access"
      : invite.permission === "edit"
        ? "Edit · most settings"
        : "View-only · read access";

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
          <Chip tone="acc">CO-OWNER INVITE</Chip>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <div className="w-type-meta">{invite.event.name.toUpperCase()}</div>
          <div
            className="w-type-display-md"
            style={{ marginTop: 6, lineHeight: 1.0 }}
          >
            Join the event.
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
            <div className="w-type-meta">YOUR ACCESS</div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 17,
                marginTop: 6,
              }}
            >
              {permLabel}
            </div>
            <p
              className="w-type-body-sm"
              style={{ marginTop: 8 }}
            >
              {invite.permission === "read_only"
                ? "You'll see the event, allocations, and guest list. Edits stay with the account owner."
                : invite.permission === "edit"
                  ? "Approve guests, manage allocations, edit night details. Billing stays with the account owner."
                  : "Same edit access as the account owner, including settings and staff."}
            </p>
          </div>
        </div>

        <div style={{ padding: "32px 24px 0" }}>
          <CoOwnerAcceptForm
            token={params.token}
            eventName={invite.event.name}
            permission={invite.permission}
            alreadyAuthed={!!user}
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
          POWERED BY <Wordmark variant="slash" size={11} />
        </div>
      </WFrame>
    </main>
  );
}
