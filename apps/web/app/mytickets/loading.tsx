const SHIMMER: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--bg-2), var(--bg-3), var(--bg-2))",
  backgroundSize: "200% 100%",
  animation: "v5shimmer 1.4s ease-in-out infinite",
  borderRadius: "var(--r-md)",
};

export default function Loading() {
  return (
    <main
      id="main-content"
      className="v5"
      style={{
        marginInline: "auto",
        width: "100%",
        maxWidth: 420,
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          padding: "var(--s-5) var(--s-5) 0",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ ...SHIMMER, width: 96, height: 28 }} />
        <div style={{ ...SHIMMER, width: 72, height: 16 }} />
      </div>
      <div
        style={{
          padding: "var(--s-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-3)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="card" style={{ overflow: "hidden" }}>
            <div style={{ ...SHIMMER, height: 140, borderRadius: 0 }} />
            <div
              style={{
                padding: "var(--s-4)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ ...SHIMMER, width: 140, height: 20 }} />
              <div style={{ ...SHIMMER, width: 72, height: 32 }} />
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes v5shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </main>
  );
}
