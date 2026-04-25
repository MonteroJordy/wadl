import Link from "next/link";
import { requireOwnerContext } from "@/lib/owner";
import { KIND_LABEL, KIND_TONE, type NotificationKind } from "@/lib/notifications";
import { markAllReadAction } from "./actions";
import EmptyState from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

export default async function NotificationsPage() {
  const { supabase, account } = await requireOwnerContext();

  const { data } = await supabase
    .from("notifications")
    .select("id, kind, payload, read_at, created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Row[];
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <main className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <header className="flex items-end justify-between pb-4">
        <div>
          <p className="label-mono mb-1">Inbox</p>
          <h1 className="display-lg">Notifications</h1>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button className="label-mono hover:text-cream" type="submit">
              Mark all read
            </button>
          </form>
        )}
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No notifications"
          body="When RSVPs come in, capacity gets tight, or staff get added — you'll see them here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const kind = r.kind as NotificationKind;
            const label = KIND_LABEL[kind] ?? r.kind;
            const tone = KIND_TONE[kind] ?? "coral";
            const toneCls =
              tone === "mint"
                ? "border-mint/30 text-mint"
                : tone === "gold"
                ? "border-gold/30 text-gold"
                : "border-coral/30 text-coral";
            const message =
              (r.payload?.message as string | undefined) ?? label;
            const href = (r.payload?.href as string | undefined) ?? null;
            const inner = (
              <>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full border ${toneCls} label-mono`}
                >
                  {label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-cream">{message}</p>
                  <p className="label-mono mt-1">{ago(r.created_at)}</p>
                </div>
                {!r.read_at && (
                  <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-coral" />
                )}
              </>
            );
            const cls = `card flex items-start gap-3 ${
              !r.read_at ? "border-coral/40" : ""
            } ${href ? "hover:border-coral transition" : ""}`;
            return (
              <li key={r.id}>
                {href ? (
                  <Link href={href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
