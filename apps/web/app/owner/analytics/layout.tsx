import AnalyticsTabs from "@/components/analytics-tabs";
import { PageHeader } from "@/components/v5";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PageHeader eyebrow="Analytics · 90-day window" title="Insights" />
      <AnalyticsTabs />
      <div style={{ padding: "var(--s-8)" }}>{children}</div>
    </main>
  );
}
