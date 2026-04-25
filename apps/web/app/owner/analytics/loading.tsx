import { SkeletonHero, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <SkeletonHero />
      <div className="mt-4 flex flex-col gap-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    </main>
  );
}
