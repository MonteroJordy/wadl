import { requireOwnerContext } from "@/lib/owner";
import NewEventForm from "./form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const { supabase, account } = await requireOwnerContext();

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, default_capacity")
    .eq("account_id", account.id)
    .order("created_at");

  const defaultCapacity = venues?.[0]?.default_capacity ?? null;

  return (
    <NewEventForm
      venues={(venues ?? []).map((v) => ({ id: v.id, name: v.name }))}
      defaultCapacity={defaultCapacity}
    />
  );
}
