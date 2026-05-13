import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoorContext, pickActiveEvent } from "@/lib/door";

export const dynamic = "force-dynamic";

export default async function ManagerHome() {
  const { admin, staff } = await requireDoorContext({
    requireRole: "door_manager",
  });
  const managerEvents = staff.filter((s) => s.role === "door_manager");

  if (managerEvents.length === 1) {
    redirect(`/manager/events/${managerEvents[0].event_id}`);
  }

  const active = await pickActiveEvent(admin, managerEvents);
  if (active) redirect(`/manager/events/${active.event_id}`);

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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div
            className="w-type-meta"
            style={{ color: "var(--w-acc)" }}
          >
            MANAGER
          </div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Pick an event.
          </div>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {managerEvents.map((s) => (
            <Link
              key={s.event_id}
              href={`/manager/events/${s.event_id}`}
              className="w-card"
              style={{
                padding: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <p style={{ fontWeight: 600, color: "var(--w-fg)" }}>
                {s.event.name}
              </p>
              <div
                className="w-type-meta"
                style={{ marginTop: 6, color: "var(--w-acc)" }}
              >
                DOOR MANAGER
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
