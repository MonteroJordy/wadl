import AnalyticsTabs from "@/components/analytics-tabs";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-frame md:max-w-5xl px-4 md:px-6 pt-12 pb-8 md:py-12">
      <header className="mb-4">
        <p className="label-mono mb-1">Analytics · 90-day window</p>
        <h1 className="display-lg">Insights</h1>
      </header>
      <AnalyticsTabs />
      {children}
    </div>
  );
}
