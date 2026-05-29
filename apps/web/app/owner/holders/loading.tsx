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
        {bar(200)}
        <div style={{ marginTop: "var(--s-4)" }}>{bar(240, 34)}</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: "var(--s-6)",
              borderRight: i === 3 ? "none" : "1px solid var(--line)",
            }}
          >
            {bar("50%")}
            <div style={{ marginTop: "var(--s-3)" }}>{bar("60%", 28)}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "var(--s-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-2)",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: "var(--s-5)" }}>
            {bar("55%")}
            <div style={{ marginTop: "var(--s-2)" }}>{bar("35%")}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
