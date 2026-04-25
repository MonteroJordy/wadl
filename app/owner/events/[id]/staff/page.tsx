import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import InviteForm from "./invite-form";
import {
  CopyLinkButton,
  RevokeInviteButton,
  RemoveStaffButton,
} from "./row-buttons";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface StaffRow {
  user_id: string;
  role: string;
  profile: { id: string; full_name: string | null; phone: string | null };
}

interface InviteRow {
  id: string;
  phone: string;
  role: string;
  token: string;
  created_at: string;
}

function roleBadge(role: string) {
  if (role === "door_manager") return "text-gold";
  if (role === "door_staff") return "text-mint";
  return "text-muted";
}

function roleLabel(role: string) {
  return role === "door_manager" ? "Manager" : role === "door_staff" ? "Staff" : role;
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
    <main className="mobile-frame">
      <header className="flex items-center justify-between pt-6 pb-4">
        <Link
          href={`/owner/events/${event.id}`}
          className="label-mono hover:text-cream"
        >
          ← Back
        </Link>
        <p className="label-mono">Staff</p>
      </header>

      <h1 className="display-lg mb-2">{event.name}</h1>
      <p className="label-mono mb-6">
        {staff.length} on · {invites.length} pending
      </p>

      <InviteForm eventId={event.id} />

      <section className="mt-8">
        <p className="label-mono mb-2">Staff on this event</p>
        {staff.length === 0 ? (
          <EmptyState
            title="No staff yet"
            body="Invite someone above to put them on the scanner tonight."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {staff.map((s) => (
              <div key={s.user_id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-cream font-semibold truncate">
                      {s.profile?.full_name ?? "Unnamed"}
                    </p>
                    <p className="label-mono mt-1 truncate">
                      {s.profile?.phone ?? "no phone"} ·{" "}
                      <span className={roleBadge(s.role)}>
                        {roleLabel(s.role)}
                      </span>
                    </p>
                  </div>
                  <RemoveStaffButton eventId={event.id} userId={s.user_id} />
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-sans text-cream font-semibold">
                      {i.phone}
                    </p>
                    <p className="label-mono mt-1">
                      <span className={roleBadge(i.role)}>
                        {roleLabel(i.role)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <CopyLinkButton url={`${appUrl}/staff-invite/${i.token}`} />
                    <RevokeInviteButton eventId={event.id} inviteId={i.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
