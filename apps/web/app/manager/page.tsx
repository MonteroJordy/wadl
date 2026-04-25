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
    <main id="main-content" className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono text-gold mb-1">Manager</p>
        <h1 className="display-lg">Pick an event.</h1>
      </header>
      <div className="flex flex-col gap-2 mt-4">
        {managerEvents.map((s) => (
          <Link
            key={s.event_id}
            href={`/manager/events/${s.event_id}`}
            className="card hover:border-gold transition"
          >
            <p className="font-sans font-semibold text-cream">{s.event.name}</p>
            <p className="label-mono mt-1 text-gold">Door manager</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
