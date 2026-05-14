/**
 * Owner dashboard loading skeleton — matches the v5 `V5Loading` mockup:
 * a meta bar, a display-size title bar, then a 3-card grid with image
 * placeholders. Skeleton fills use var(--bg-3).
 */
function Bar({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        background: "var(--bg-3)",
        borderRadius: "var(--r-sm)",
      }}
    />
  );
}

export default function Loading() {
  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <div style={{ padding: "var(--s-8)" }}>
        <Bar w={180} />
        <div style={{ marginTop: "var(--s-4)" }}>
          <Bar w={420} h={32} />
        </div>
        <div
          style={{
            marginTop: "var(--s-6)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--s-4)",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: 0 }}>
              <div style={{ height: 160, background: "var(--bg-3)" }} />
              <div style={{ padding: "var(--s-4)" }}>
                <Bar w="60%" />
                <div style={{ marginTop: "var(--s-3)" }}>
                  <Bar w="40%" h={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
