export default function Loading() {
  const bar = (w: number | string, h = 14) => (
    <div
      style={{
        height: h,
        width: w,
        background: "var(--bg-3)",
        borderRadius: "var(--r-sm)",
      }}
    />
  );
  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          padding: "var(--s-8) var(--s-8) var(--s-6)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {bar(160)}
        <div style={{ marginTop: "var(--s-4)" }}>{bar(260, 34)}</div>
      </div>
      <div
        style={{
          padding: "var(--s-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-2)",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: "var(--s-4)" }}>
            {bar("40%")}
            <div style={{ marginTop: "var(--s-2)" }}>{bar("85%")}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
