import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDoorContext, pickActiveEvent } from "@/lib/door";

export const dynamic = "force-dynamic";

export default async function DoorHome() {
  const { admin, staff } = await requireDoorContext({});
  if (staff.length === 1) {
    redirect(`/door/events/${staff[0].event_id}`);
  }

  const active = await pickActiveEvent(admin, staff);
  if (active) redirect(`/door/events/${active.event_id}`);

  return (
    <main className="mobile-frame">
      <header className="pt-6 pb-4">
        <p className="label-mono text-mint mb-1">Door</p>
        <h1 className="display-lg">Pick an event.</h1>
      </header>
      <div className="flex flex-col gap-2 mt-4">
        {staff.map((s) => (
          <Link
            key={s.event_id}
            href={`/door/events/${s.event_id}`}
            className="card hover:border-mint transition"
          >
            <p className="font-sans font-semibold text-cream">{s.event.name}</p>
            <p className="label-mono mt-1 text-mint">
              {s.role === "door_manager" ? "Door manager" : "Door staff"}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
