import { SkeletonHero, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <main id="main-content" className="mobile-frame">
      <SkeletonHero />
      <div className="mt-4 flex flex-col gap-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    </main>
  );
}
