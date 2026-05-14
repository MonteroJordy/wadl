import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/v5";
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
        <div className="t-meta">Co-owner invite</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-3)" }}>
          {title}
        </div>
        <p className="t-body-2" style={{ marginTop: "var(--s-3)" }}>
          {body}
        </p>
        <Link
          href="/discover"
          className="btn btn--ghost"
          style={{ marginTop: "var(--s-6)", textDecoration: "none" }}
        >
          WADL home
        </Link>
      </div>
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
        <span className="chip chip--solid">Co-owner invite</span>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <div className="t-meta">{invite.event.name}</div>
        <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
          Join the event.
        </div>
      </div>

      <div style={{ padding: "var(--s-6) var(--s-6) 0" }}>
        <div
          className="card"
          style={{ padding: "var(--s-5)", borderColor: "var(--fg)" }}
        >
          <div className="t-meta">Your access</div>
          <div className="t-h1" style={{ marginTop: "var(--s-2)" }}>
            {permLabel}
          </div>
          <p className="t-body-2" style={{ marginTop: "var(--s-2)" }}>
            {invite.permission === "read_only"
              ? "You'll see the event, allocations, and guest list. Edits stay with the account owner."
              : invite.permission === "edit"
                ? "Approve guests, manage allocations, edit night details. Billing stays with the account owner."
                : "Same edit access as the account owner, including settings and staff."}
          </p>
        </div>
      </div>

      <div style={{ padding: "var(--s-8) var(--s-6) 0" }}>
        <CoOwnerAcceptForm
          token={params.token}
          eventName={invite.event.name}
          permission={invite.permission}
          alreadyAuthed={!!user}
        />
      </div>

      <div
        style={{
          paddingTop: "var(--s-8)",
          paddingBottom: "var(--s-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--s-2)",
        }}
      >
        <span className="t-meta">Powered by</span>
        <Logo size={11} />
      </div>
    </main>
  );
}
