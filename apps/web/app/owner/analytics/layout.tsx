import AnalyticsTabs from "@/components/analytics-tabs";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          style={{
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 24,
          }}
        >
          <div className="w-type-meta">ANALYTICS · 90-DAY WINDOW</div>
          <div className="w-type-display-md" style={{ marginTop: 8 }}>
            Insights
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <AnalyticsTabs />
        </div>
        {children}
      </div>
    </main>
  );
}
