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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {bar(220, 28)}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: "var(--s-5)" }}>
            {bar("50%")}
            <div style={{ marginTop: "var(--s-3)" }}>{bar("60%", 28)}</div>
          </div>
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="card" style={{ padding: "var(--s-6)" }}>
          {bar("30%")}
          <div style={{ marginTop: "var(--s-4)" }}>{bar("100%", 96)}</div>
        </div>
      ))}
    </div>
  );
}
