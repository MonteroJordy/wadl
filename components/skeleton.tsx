/**
 * Skeleton primitives matching the WADL design tokens.
 * Subtle mint tint pulse, dark substrate.
 */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-s2 via-mint/10 to-s2 bg-[length:200%_100%] animate-skeleton rounded ${className}`}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <SkeletonBar className="h-3 w-1/4 mb-3" />
      <SkeletonBar className="h-5 w-3/4 mb-2" />
      {Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => (
        <SkeletonBar key={i} className="h-3 w-full mb-2" />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div>
      <SkeletonBar className="h-3 w-24 mb-2" />
      <SkeletonBar className="h-10 w-3/4 mb-6" />
      <SkeletonCard lines={4} />
    </div>
  );
}
