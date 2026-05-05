import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoorContext, pickActiveEvent } from "@/lib/door";
import { Chip, IconArrow, WFrame, Wordmark } from "@/components/wadl";

export const dynamic = "force-dynamic";

export default async function DoorHome() {
  const { admin, staff } = await requireDoorContext({});
  if (staff.length === 1) {
    redirect(`/door/events/${staff[0].event_id}`);
  }

  const active = await pickActiveEvent(admin, staff);
  if (active) redirect(`/door/events/${active.event_id}`);

  return (
    <main id="main-content">
      <WFrame style={{ paddingBottom: 48 }}>
        <div style={{ padding: "20px 24px 0" }}>
          <Wordmark variant="monogrid" size={18} />
        </div>

        <div style={{ padding: "48px 24px 0" }}>
          <div className="w-type-meta">DOOR · STAFF</div>
          <div className="w-type-display-lg" style={{ marginTop: 12 }}>
            Pick an
            <br />
            event.
          </div>
          <p
            className="w-type-body-sm"
            style={{
              color: "var(--w-fg-muted)",
              marginTop: 16,
              maxWidth: 320,
            }}
          >
            You&apos;re scheduled across {staff.length} events. Tap one to
            open the scanner.
          </p>
        </div>

        <div
          style={{
            padding: "32px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {staff.map((s) => (
            <Link
              key={s.event_id}
              href={`/door/events/${s.event_id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="w-card"
                style={{
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.event.name}
                  </div>
                  <div className="w-type-meta" style={{ marginTop: 4 }}>
                    {s.role === "door_manager"
                      ? "DOOR MANAGER"
                      : "DOOR STAFF"}
                  </div>
                </div>
                <Chip tone="ghost">
                  <IconArrow size={12} />
                </Chip>
              </div>
            </Link>
          ))}
        </div>
      </WFrame>
    </main>
  );
}
