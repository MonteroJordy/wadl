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
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "var(--s-8) var(--s-6) var(--s-24)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--line)",
            paddingBottom: "var(--s-6)",
            marginBottom: "var(--s-6)",
          }}
        >
          <div className="t-meta">Manager</div>
          <div className="t-display-md" style={{ marginTop: "var(--s-2)" }}>
            Pick an event.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
          }}
        >
          {managerEvents.map((s) => (
            <Link
              key={s.event_id}
              href={`/manager/events/${s.event_id}`}
              className="card card--hover"
              style={{
                padding: "var(--s-4)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <p className="t-h1">{s.event.name}</p>
              <div className="t-meta" style={{ marginTop: "var(--s-2)" }}>
                Door manager
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
