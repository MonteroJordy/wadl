import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/v5";

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

const SEV_COLOR: Record<string, string> = {
  fatal: "var(--err)",
  error: "var(--err)",
  warn: "var(--warn)",
  info: "var(--ok)",
};

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
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader
        eyebrow="Platform owner only"
        title="Error log"
        sub={`${rows.length} most recent · captureException() writes here automatically.`}
      />

      <div
        style={{
          padding: "var(--s-4) var(--s-8)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: "var(--s-1)",
        }}
      >
        {(["all", "fatal", "error", "warn", "info"] as const).map((s) => {
          const active = (searchParams.severity ?? "all") === s;
          return (
            <a
              key={s}
              href={
                s === "all" ? "/owner/errors" : `/owner/errors?severity=${s}`
              }
              className={"nav-item" + (active ? " nav-item--active" : "")}
              style={{ fontSize: "var(--ts-sm)", textDecoration: "none" }}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </a>
          );
        })}
      </div>

      <div style={{ padding: "var(--s-8)", maxWidth: 1080 }}>
        {rows.length === 0 ? (
          <p className="t-body-2">No errors. Or none captured.</p>
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-2)",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {rows.map((r) => (
              <li
                key={r.id}
                className="card"
                style={{ padding: "var(--s-4)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "var(--s-2)",
                    marginBottom: "var(--s-1)",
                  }}
                >
                  <p
                    className="t-body truncate"
                    style={{ flex: 1, minWidth: 0, fontWeight: 500 }}
                  >
                    {r.message}
                  </p>
                  <div className="t-meta" style={{ flexShrink: 0 }}>
                    {new Date(r.occurred_at).toLocaleString()}
                  </div>
                </div>
                <div className="t-meta" style={{ marginBottom: "var(--s-2)" }}>
                  <span
                    style={{ color: SEV_COLOR[r.severity] ?? "var(--fg)" }}
                  >
                    {r.severity.toUpperCase()}
                  </span>
                  {r.route && (
                    <span style={{ marginLeft: "var(--s-2)" }}>{r.route}</span>
                  )}
                  {r.user_id && (
                    <span
                      style={{
                        marginLeft: "var(--s-2)",
                        color: "var(--fg-3)",
                      }}
                    >
                      user={r.user_id.slice(0, 8)}
                    </span>
                  )}
                </div>
                {r.stack && (
                  <pre
                    style={{
                      fontSize: 11,
                      color: "var(--fg-3)",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--mono)",
                      lineHeight: 1.4,
                    }}
                  >
                    {r.stack.split("\n").slice(0, 6).join("\n")}
                  </pre>
                )}
                {r.context && (
                  <details style={{ marginTop: "var(--s-2)" }}>
                    <summary
                      className="t-meta"
                      style={{ cursor: "pointer" }}
                    >
                      Context
                    </summary>
                    <pre
                      style={{
                        fontSize: 11,
                        color: "var(--fg-3)",
                        marginTop: "var(--s-1)",
                        overflowX: "auto",
                        fontFamily: "var(--mono)",
                        lineHeight: 1.4,
                      }}
                    >
                      {JSON.stringify(r.context, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
