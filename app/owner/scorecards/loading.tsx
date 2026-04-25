import { SkeletonHero, SkeletonList } from "@/components/skeleton";

export default function Loading() {
  return (
    <main id="main-content" className="mx-auto max-w-frame md:max-w-3xl px-6 pt-12 pb-8 md:py-12">
      <SkeletonHero />
      <div className="mt-4">
        <SkeletonList count={5} />
      </div>
    </main>
  );
}
