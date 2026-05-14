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
        {bar(80)}
        <div style={{ marginTop: "var(--s-4)" }}>{bar(200, 34)}</div>
      </div>
      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 880,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-6)",
        }}
      >
        <div className="card" style={{ padding: "var(--s-6)" }}>
          {bar("30%")}
          <div style={{ marginTop: "var(--s-3)" }}>{bar("100%", 44)}</div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ padding: "var(--s-5)" }}>
            {bar("60%")}
            <div style={{ marginTop: "var(--s-2)" }}>{bar("40%")}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
