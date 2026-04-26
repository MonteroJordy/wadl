import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    <main id="main-content" className="mobile-frame">
      <div className="pt-12 text-center">
        <p className="label-mono mb-3">WADL / Staff invite</p>
        <h1 className="display-lg mb-4">{title}</h1>
        <p className="text-muted text-sm">{body}</p>
        {cta}
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
      "id, phone, role, used_at, expires_at, event:events!inner(id, name)"
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
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return <Shell title="Expired." body="Ask for a fresh invite link." />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main id="main-content" className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono mb-2">WADL / Staff</p>
        <h1 className="display-lg">Working the door.</h1>
      </header>

      <div className="card mb-5">
        <p className="label-mono mb-1">{invite.event.name}</p>
        <p className="font-sans text-cream font-semibold">
          {invite.role === "door_manager"
            ? "Door manager"
            : invite.role === "photographer"
            ? "Photographer"
            : "Door staff"}
        </p>
      </div>

      <InviteAcceptForm
        token={params.token}
        invitePhone={invite.phone}
        eventName={invite.event.name}
        role={invite.role}
        alreadyAuthedPhone={user?.phone ?? null}
      />

      <p className="label-mono mt-auto pt-8 text-center">
        Need help?{" "}
        <Link href="/discover" className="text-coral hover:brightness-125">
          WADL home
        </Link>
      </p>
    </main>
  );
}
