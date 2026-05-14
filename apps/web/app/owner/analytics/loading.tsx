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
        <div style={{ marginTop: "var(--s-4)" }}>{bar(220, 34)}</div>
      </div>
      <div
        style={{
          padding: "0 var(--s-8)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: "var(--s-4)",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ padding: "var(--s-4) 0" }}>
            {bar(72)}
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "var(--s-8)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-4)",
        }}
      >
        <div
          className="card"
          style={{
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                padding: "var(--s-6)",
                borderRight: i === 4 ? "none" : "1px solid var(--line)",
              }}
            >
              {bar("50%")}
              <div style={{ marginTop: "var(--s-3)" }}>{bar("70%", 28)}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "var(--s-6)" }}>
          {bar("30%")}
          <div style={{ marginTop: "var(--s-4)" }}>{bar("100%", 128)}</div>
        </div>
      </div>
    </main>
  );
}
