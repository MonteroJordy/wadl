import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, Chip } from "@/components/wadl";
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

function permissionTone(p: string): "ok" | "warn" | "acc" | "ghost" {
  if (p === "admin") return "warn";
  if (p === "edit") return "acc";
  if (p === "read_only") return "ok";
  return "ghost";
}

function permissionLabel(p: string) {
  if (p === "admin") return "ADMIN";
  if (p === "edit") return "EDIT";
  if (p === "read_only") return "VIEW-ONLY";
  return p.toUpperCase();
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
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link
          href={`/owner/events/${event.id}`}
          className="w-type-meta"
          style={{ textDecoration: "none" }}
        >
          ← {event.name.toUpperCase()}
        </Link>

        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginTop: 16,
          }}
        >
          <div className="w-type-meta">CO-OWNERS · BRAND × VENUE</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Share the keys
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 8,
            }}
          >
            {coOwners.length} on · {invites.length} pending
          </p>
        </div>

        <div style={{ marginTop: 24 }}>
          <CoOwnerInviteForm eventId={event.id} />
        </div>

        <section style={{ marginTop: 32 }}>
          <div className="w-type-meta" style={{ marginBottom: 12 }}>
            ACTIVE CO-OWNERS · {coOwners.length}
          </div>
          {coOwners.length === 0 ? (
            <div
              className="w-card"
              style={{
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <div className="w-type-h2">None yet</div>
              <p
                className="w-type-body-sm"
                style={{
                  color: "var(--w-fg-muted)",
                  marginTop: 12,
                  maxWidth: 420,
                  marginInline: "auto",
                }}
              >
                Invite another account above. They&apos;ll see this event in
                their dashboard once they accept.
              </p>
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {coOwners.map((c) => (
                <li key={c.account_id}>
                  <div
                    className="w-card"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Avatar name={c.account.display_name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.account.display_name}
                      </div>
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        {c.account.account_type.toUpperCase()}
                      </div>
                    </div>
                    <Chip tone={permissionTone(c.permission)}>
                      {permissionLabel(c.permission)}
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {invites.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div className="w-type-meta" style={{ marginBottom: 12 }}>
              PENDING INVITES · {invites.length}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {invites.map((i) => (
                <li key={i.id}>
                  <div
                    className="w-card"
                    style={{
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderColor: "var(--w-warn)",
                      background: "oklch(0.86 0.16 85 / 0.06)",
                    }}
                  >
                    <Chip tone="warn">PENDING</Chip>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--w-mono)",
                          fontSize: 14,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {i.invitee_phone || i.invitee_email}
                      </div>
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        SENT{" "}
                        {new Date(i.created_at)
                          .toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                          .toUpperCase()}
                      </div>
                    </div>
                    <Chip tone={permissionTone(i.permission)}>
                      {permissionLabel(i.permission)}
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
