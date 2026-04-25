import { SkeletonHero, SkeletonList } from "@/components/skeleton";

export default function Loading() {
  return (
    <main id="main-content" className="mobile-frame">
      <SkeletonHero />
      <div className="mt-4">
        <SkeletonList count={4} />
      </div>
    </main>
  );
}
