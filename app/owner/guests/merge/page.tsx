import Link from "next/link";
import { requireOwnerContext, fmtDate } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import MergeForm from "./merge-form";

export const dynamic = "force-dynamic";

interface SideRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  night: {
    night_date: string;
    event: { id: string; name: string; account_id: string };
  };
  check_ins: Array<{ state: string }>;
}

export default async function GuestMergePage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const { account } = await requireOwnerContext();
  const ids = (searchParams.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length !== 2) {
    return (
      <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
        <h1 className="display-lg mb-4">Merge guests</h1>
        <p className="text-muted text-sm mb-2">
          Pass two guest IDs in the URL like:{" "}
          <code className="text-coral">/owner/guests/merge?ids=A,B</code>.
        </p>
        <p className="text-muted text-sm">
          Find guest IDs from the queue or guest detail page (last segment of the URL).
        </p>
        <Link href="/owner" className="btn-ghost mt-6 inline-block">
          ← Back
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("guests")
    .select(
      "id, full_name, phone, email, notes, tags, status, created_at, " +
        "night:event_nights!inner(night_date, event:events!inner(id, name, account_id)), " +
        "check_ins(state)"
    )
    .in("id", ids);
  const rows = ((data ?? []) as unknown as SideRow[]).filter(
    (r) => r.night.event.account_id === account.id
  );
  if (rows.length !== 2) {
    return (
      <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
        <h1 className="display-lg mb-4">Merge guests</h1>
        <p className="text-coral text-sm">
          One or both guests not found, or not in your account.
        </p>
        <Link href="/owner" className="btn-ghost mt-6 inline-block">
          ← Back
        </Link>
      </main>
    );
  }

  // Stable order: A = first id passed in URL, B = second.
  const a = rows.find((r) => r.id === ids[0])!;
  const b = rows.find((r) => r.id === ids[1])!;

  function side(r: SideRow) {
    return {
      id: r.id,
      full_name: r.full_name,
      phone: r.phone,
      email: r.email,
      notes: r.notes,
      tags: r.tags ?? [],
      event_name: r.night.event.name,
      night_date: fmtDate(r.night.night_date),
      status: r.status,
      check_ins: r.check_ins.length,
      created_at: r.created_at,
    };
  }

  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-2xl px-6 pt-12 pb-8 md:py-12">
      <header className="mb-4">
        <Link href="/owner" className="label-mono hover:text-cream">
          ← Back
        </Link>
        <h1 className="display-lg mt-3 mb-1">Merge guests</h1>
        <p className="label-mono">
          The older record wins. The newer becomes a soft-deleted reference.
          Check-ins, tags, referrals carry over.
        </p>
      </header>

      <MergeForm a={side(a)} b={side(b)} />
    </main>
  );
}
