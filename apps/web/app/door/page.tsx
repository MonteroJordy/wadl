import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoorContext, pickActiveEvent } from "@/lib/door";
import { Logo } from "@/components/v5";

export const dynamic = "force-dynamic";

export default async function DoorHome() {
  const { admin, staff } = await requireDoorContext({});
  if (staff.length === 1) {
    redirect(`/door/events/${staff[0].event_id}`);
  }

  const active = await pickActiveEvent(admin, staff);
  if (active) redirect(`/door/events/${active.event_id}`);

  return (
    <main
      id="main-content"
      className="v5"
      style={{ background: "var(--bg)", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <div style={{ padding: "var(--s-6) var(--s-8) 0" }}>
          <Logo size={18} />
        </div>

        <div style={{ padding: "var(--s-12) var(--s-8) 0" }}>
          <div className="t-meta">Door · staff</div>
          <div
            className="t-display-lg"
            style={{ marginTop: "var(--s-3)", lineHeight: 1.0 }}
          >
            Pick an
            <br />
            event.
          </div>
          <p
            className="t-body-2"
            style={{ marginTop: "var(--s-4)", maxWidth: 320 }}
          >
            You&apos;re scheduled across {staff.length} events. Tap one to
            open the scanner.
          </p>
        </div>

        <div
          style={{
            padding: "var(--s-8)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-2)",
          }}
        >
          {staff.map((s) => (
            <Link
              key={s.event_id}
              href={`/door/events/${s.event_id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="card card--hover"
                style={{
                  padding: "var(--s-5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s-4)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="t-h2"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.event.name}
                  </div>
                  <div
                    className="t-meta"
                    style={{ marginTop: "var(--s-1)" }}
                  >
                    {s.role === "door_manager"
                      ? "Door manager"
                      : "Door staff"}
                  </div>
                </div>
                <span
                  className="t-h2"
                  style={{ color: "var(--fg-3)", flexShrink: 0 }}
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
