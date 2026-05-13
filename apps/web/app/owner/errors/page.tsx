import { redirect } from "next/navigation";
import { requireOwnerContext } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chip } from "@/components/wadl";

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
  fatal: "var(--w-err)",
  error: "var(--w-err)",
  warn: "var(--w-warn)",
  info: "var(--w-ok)",
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
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">PLATFORM OWNER ONLY</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Error log
          </div>
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)", marginTop: 8 }}
          >
            {rows.length} most recent · captureException() writes here
            automatically.
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["all", "fatal", "error", "warn", "info"] as const).map((s) => {
            const active = (searchParams.severity ?? "all") === s;
            return (
              <a
                key={s}
                href={
                  s === "all" ? "/owner/errors" : `/owner/errors?severity=${s}`
                }
                style={{ textDecoration: "none" }}
              >
                <Chip tone={active ? "acc" : "ghost"}>{s.toUpperCase()}</Chip>
              </a>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p
            className="w-type-body-sm"
            style={{ color: "var(--w-fg-muted)" }}
          >
            No errors. Or none captured.
          </p>
        ) : (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {rows.map((r) => {
              const accentBorder =
                r.severity === "fatal"
                  ? "var(--w-err)"
                  : r.severity === "error"
                    ? "var(--w-err)"
                    : r.severity === "warn"
                      ? "var(--w-warn)"
                      : "var(--w-line)";
              return (
                <li
                  key={r.id}
                  className="w-card"
                  style={{
                    padding: 16,
                    borderColor: accentBorder,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <p
                      style={{
                        color: "var(--w-fg)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {r.message}
                    </p>
                    <div
                      className="w-type-meta"
                      style={{ flexShrink: 0 }}
                    >
                      {new Date(r.occurred_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="w-type-meta" style={{ marginBottom: 8 }}>
                    <span
                      style={{ color: SEV_COLOR[r.severity] ?? "var(--w-fg)" }}
                    >
                      {r.severity.toUpperCase()}
                    </span>
                    {r.route && (
                      <span style={{ marginLeft: 8 }}>{r.route}</span>
                    )}
                    {r.user_id && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: "var(--w-fg-muted)",
                        }}
                      >
                        USER={r.user_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  {r.stack && (
                    <pre
                      style={{
                        fontSize: 11,
                        color: "var(--w-fg-muted)",
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                        fontFamily: "var(--w-mono)",
                        lineHeight: 1.4,
                      }}
                    >
                      {r.stack.split("\n").slice(0, 6).join("\n")}
                    </pre>
                  )}
                  {r.context && (
                    <details style={{ marginTop: 8 }}>
                      <summary
                        className="w-type-meta"
                        style={{ cursor: "pointer" }}
                      >
                        CONTEXT
                      </summary>
                      <pre
                        style={{
                          fontSize: 11,
                          color: "var(--w-fg-muted)",
                          marginTop: 4,
                          overflowX: "auto",
                          fontFamily: "var(--w-mono)",
                          lineHeight: 1.4,
                        }}
                      >
                        {JSON.stringify(r.context, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
