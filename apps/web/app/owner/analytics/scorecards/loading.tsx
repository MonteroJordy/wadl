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
    <div className="card" style={{ padding: "var(--s-6)" }}>
      {bar("30%")}
      <div style={{ marginTop: "var(--s-4)" }}>{bar("100%", 240)}</div>
    </div>
  );
}
