/**
 * Skeleton primitives matching the v3 design tokens. Animated shimmer via
 * inline keyframes so we don't depend on Tailwind's animate-* utilities,
 * which were removed in the v3 repaint.
 */

const SHIMMER: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, var(--w-surface-2), var(--w-surface-3), var(--w-surface-2))",
  backgroundSize: "200% 100%",
  animation: "wadlSkeleton 1.4s ease-in-out infinite",
};

export function SkeletonBar({
  height = 12,
  width = "100%",
  style,
}: {
  height?: number;
  width?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <style>{`@keyframes wadlSkeleton { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div
        style={{
          ...SHIMMER,
          height,
          width,
          ...style,
        }}
      />
    </>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="w-card" style={{ padding: 16 }}>
      <SkeletonBar height={12} width="25%" style={{ marginBottom: 12 }} />
      <SkeletonBar height={20} width="75%" style={{ marginBottom: 8 }} />
      {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
        <SkeletonBar
          key={i}
          height={12}
          style={{ marginBottom: 8 }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div>
      <SkeletonBar height={12} width={96} style={{ marginBottom: 8 }} />
      <SkeletonBar height={40} width="75%" style={{ marginBottom: 24 }} />
      <SkeletonCard lines={4} />
    </div>
  );
}

/**
 * Drop-in <main> skeleton matching the v3 owner-page padding so the
 * route-transition feels seamless (no layout shift when data resolves).
 */
export function OwnerPageSkeleton({
  rows = 4,
  maxWidth = 1600,
}: {
  rows?: number;
  maxWidth?: number;
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
      <div style={{ maxWidth, margin: "0 auto" }}>
        <SkeletonHero />
        <div style={{ marginTop: 16 }}>
          <SkeletonList count={rows} />
        </div>
      </div>
    </main>
  );
}
