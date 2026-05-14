import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumb, PageHeader, EventSubNav } from "@/components/v5";
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

function permissionTone(p: string): "ok" | "warn" | "info" | "ghost" {
  if (p === "admin") return "warn";
  if (p === "edit") return "info";
  if (p === "read_only") return "ok";
  return "ghost";
}

function permissionLabel(p: string) {
  if (p === "admin") return "Admin";
  if (p === "edit") return "Edit";
  if (p === "read_only") return "View-only";
  return p;
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
        "account_id, permission, account:accounts!inner(display_name, account_type)",
      )
      .eq("event_id", event.id),
    admin
      .from("co_owner_invites")
      .select(
        "id, invitee_phone, invitee_email, permission, token, created_at",
      )
      .eq("event_id", event.id)
      .is("used_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const coOwners = (coOwnersRes.data ?? []) as unknown as CoOwnerRow[];
  const invites = (invitesRes.data ?? []) as InviteRow[];

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <Breadcrumb
        items={[
          ["Events", "/owner"],
          [event.name, `/owner/events/${event.id}`],
          "Co-owners",
        ]}
      />
      <PageHeader
        eyebrow="Co-owners · brand × venue"
        title="Share the keys"
        sub={`${coOwners.length} on · ${invites.length} pending`}
      />
      <EventSubNav active="settings" eventId={event.id} />

      <div style={{ padding: "var(--s-8)" }}>
        <div style={{ maxWidth: 720 }}>
          <CoOwnerInviteForm eventId={event.id} />
        </div>

        <section style={{ marginTop: "var(--s-10)" }}>
          <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
            Active co-owners · {coOwners.length}
          </div>
          {coOwners.length === 0 ? (
            <div
              className="card"
              style={{ padding: "var(--s-12) var(--s-8)", textAlign: "center" }}
            >
              <div className="t-h1">None yet</div>
              <div
                className="t-body-2"
                style={{
                  marginTop: "var(--s-3)",
                  maxWidth: 420,
                  marginInline: "auto",
                }}
              >
                Invite another account above. They&apos;ll see this event in
                their dashboard once they accept.
              </div>
            </div>
          ) : (
            <div className="card">
              {coOwners.map((c) => (
                <div
                  key={c.account_id}
                  className="row"
                  style={{ gridTemplateColumns: "36px 1fr 120px 120px" }}
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
                    {initials(c.account.display_name)}
                  </div>
                  <span className="t-h1 truncate">
                    {c.account.display_name}
                  </span>
                  <span className="t-meta">{c.account.account_type}</span>
                  <span className={`chip chip--${permissionTone(c.permission)}`}>
                    {permissionLabel(c.permission)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {invites.length > 0 && (
          <section style={{ marginTop: "var(--s-10)" }}>
            <div className="t-meta" style={{ marginBottom: "var(--s-3)" }}>
              Pending invites · {invites.length}
            </div>
            <div className="card">
              {invites.map((i) => (
                <div
                  key={i.id}
                  className="row"
                  style={{ gridTemplateColumns: "100px 1fr 200px 120px" }}
                >
                  <span className="chip chip--warn">Pending</span>
                  <span
                    className="t-body truncate"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {i.invitee_phone || i.invitee_email}
                  </span>
                  <span className="t-meta">
                    Sent{" "}
                    {new Date(i.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className={`chip chip--${permissionTone(i.permission)}`}>
                    {permissionLabel(i.permission)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
