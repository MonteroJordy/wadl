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
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: "var(--s-6)" }}>
          {bar("30%")}
          <div style={{ marginTop: "var(--s-4)" }}>{bar("100%", 96)}</div>
        </div>
      ))}
    </div>
  );
}
