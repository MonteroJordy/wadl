import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PLATFORM_OWNER_EMAIL = "jmontero@mainframeagency.com";

interface ErrorRow {
  id: string;
  occurred_at: string;
  route: string | null;
  user_id: string | null;
  account_id: string | null;
  severity: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: { severity?: string };
}) {
  const { profile } = await requireOwnerContext();
  if (profile.email !== PLATFORM_OWNER_EMAIL) redirect("/owner");

  const admin = createAdminClient();
  let q = admin
    .from("error_log")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (searchParams.severity) q = q.eq("severity", searchParams.severity);
  const { data } = await q;
  const rows = (data ?? []) as ErrorRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-12">
      <header className="mb-6">
        <p className="label-mono mb-1">Platform owner only</p>
        <h1 className="display-lg">Error log</h1>
        <p className="label-mono mt-2">
          {rows.length} most recent · captureException() writes here automatically.
        </p>
      </header>

      <div className="flex gap-1 mb-4">
        {(["all", "fatal", "error", "warn", "info"] as const).map((s) => (
          <a
            key={s}
            href={s === "all" ? "/owner/errors" : `/owner/errors?severity=${s}`}
            className={`px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
              (searchParams.severity ?? "all") === s
                ? "border-coral bg-s2 text-cream"
                : "border-line bg-s1 text-muted hover:text-cream"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-muted">No errors. Or none captured.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`card border-line ${
                r.severity === "fatal"
                  ? "border-coral"
                  : r.severity === "error"
                  ? "border-coral/40"
                  : r.severity === "warn"
                  ? "border-gold/40"
                  : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="font-sans text-cream font-semibold truncate">
                  {r.message}
                </p>
                <p className="label-mono shrink-0">
                  {new Date(r.occurred_at).toLocaleString()}
                </p>
              </div>
              <p className="label-mono mb-2">
                <span
                  className={
                    r.severity === "fatal" || r.severity === "error"
                      ? "text-coral"
                      : r.severity === "warn"
                      ? "text-gold"
                      : "text-mint"
                  }
                >
                  {r.severity}
                </span>
                {r.route && <span className="ml-2">{r.route}</span>}
                {r.user_id && (
                  <span className="ml-2 text-muted">
                    user={r.user_id.slice(0, 8)}
                  </span>
                )}
              </p>
              {r.stack && (
                <pre className="text-xs text-muted overflow-x-auto whitespace-pre-wrap font-mono">
                  {r.stack.split("\n").slice(0, 6).join("\n")}
                </pre>
              )}
              {r.context && (
                <details className="mt-2">
                  <summary className="label-mono cursor-pointer">context</summary>
                  <pre className="text-xs text-muted mt-1 overflow-x-auto font-mono">
                    {JSON.stringify(r.context, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
