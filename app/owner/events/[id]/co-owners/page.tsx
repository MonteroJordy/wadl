import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import EmptyState from "@/components/empty-state";
import CoOwnerInviteForm from "./invite-form";

export const dynamic = "force-dynamic";

interface CoOwnerRow {
  account_id: string;
  permission: string;
  account: { display_name: string; account_type: string };
}
interface InviteRow {
  id: string;
  invitee_phone: string | null;
  invitee_email: string | null;
  permission: string;
  token: string;
  created_at: string;
}

export default async function CoOwnersPage({
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

  const [coOwnersRes, invitesRes] = await Promise.all([
    admin
      .from("event_co_owners")
      .select(
        "account_id, permission, account:accounts!inner(display_name, account_type)"
      )
      .eq("event_id", event.id),
    admin
      .from("co_owner_invites")
      .select("id, invitee_phone, invitee_email, permission, token, created_at")
      .eq("event_id", event.id)
      .is("used_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const coOwners = (coOwnersRes.data ?? []) as unknown as CoOwnerRow[];
  const invites = (invitesRes.data ?? []) as InviteRow[];

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between pb-4">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream transition"
        >
          ← Back
        </Link>
        <p className="label-mono">Co-owners</p>
      </header>

      <h1 className="display-lg leading-[0.95] mb-2">{event.name}</h1>
      <p className="label-mono mb-6">
        {coOwners.length} on · {invites.length} pending
      </p>

      <CoOwnerInviteForm eventId={event.id} />

      <section className="mt-8">
        <p className="label-mono mb-2">Active co-owners</p>
        {coOwners.length === 0 ? (
          <EmptyState
            title="None yet"
            body="Invite another account above. They'll see this event in their dashboard once they accept."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {coOwners.map((c) => (
              <div key={c.account_id} className="card flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans text-cream font-semibold truncate">
                    {c.account.display_name}
                  </p>
                  <p className="label-mono mt-1">
                    {c.account.account_type} ·{" "}
                    <span className="text-coral">{c.permission.replace("_", "-")}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {invites.length > 0 && (
        <section className="mt-8">
          <p className="label-mono mb-2">Pending invites</p>
          <div className="flex flex-col gap-2">
            {invites.map((i) => (
              <div key={i.id} className="card">
                <p className="font-sans text-cream font-semibold truncate">
                  {i.invitee_phone || i.invitee_email}
                </p>
                <p className="label-mono mt-1">
                  <span className="text-coral">
                    {i.permission.replace("_", "-")}
                  </span>{" "}
                  · sent{" "}
                  {new Date(i.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
