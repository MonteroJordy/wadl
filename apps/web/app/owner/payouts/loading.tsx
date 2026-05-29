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
        <div style={{ marginTop: "var(--s-4)" }}>{bar(220, 34)}</div>
      </div>
      <div
        style={{
          padding: "var(--s-8)",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
        }}
      >
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ padding: "var(--s-6)" }}>
            {bar("30%")}
            <div style={{ marginTop: "var(--s-3)" }}>{bar("60%", 20)}</div>
            <div style={{ marginTop: "var(--s-3)" }}>{bar("90%")}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
