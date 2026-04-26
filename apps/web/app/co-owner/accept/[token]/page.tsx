import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CoOwnerAcceptForm from "./form";

export const dynamic = "force-dynamic";

interface InviteLookup {
  id: string;
  permission: "read_only" | "edit" | "admin";
  used_at: string | null;
  expires_at: string | null;
  event: { id: string; name: string };
}

function Shell({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main id="main-content" className="mobile-frame">
      <div className="pt-12 text-center">
        <p className="label-mono mb-3">WADL / Co-owner</p>
        <h1 className="display-lg mb-4">{title}</h1>
        <p className="text-muted text-sm">{body}</p>
        <Link href="/discover" className="btn-ghost mt-6 inline-block">
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
      "id, permission, used_at, expires_at, event:events!inner(id, name)"
    )
    .eq("token", params.token)
    .maybeSingle<InviteLookup>();

  if (!invite) return <Shell title="Invite not found." body="Check the link." />;
  if (invite.used_at)
    return <Shell title="Already used." body="Ask the host for a new invite." />;
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return <Shell title="Expired." body="Ask the host for a fresh invite." />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main id="main-content" className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono mb-2">WADL / Co-owner invite</p>
        <h1 className="display-lg">Join the event.</h1>
      </header>

      <div className="card mb-5">
        <p className="label-mono mb-1">{invite.event.name}</p>
        <p className="font-sans text-cream font-semibold">View-only access</p>
        <p className="label-mono mt-2">
          You&apos;ll see the event, allocations, and guest list. Edits stay
          with the account owner.
        </p>
      </div>

      <CoOwnerAcceptForm
        token={params.token}
        eventName={invite.event.name}
        permission={invite.permission}
        alreadyAuthed={!!user}
      />
    </main>
  );
}
