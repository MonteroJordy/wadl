import { SkeletonHero, SkeletonList } from "@/components/skeleton";

export default function Loading() {
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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <SkeletonHero />
        <div style={{ marginTop: 16 }}>
          <SkeletonList count={5} />
        </div>
      </div>
    </main>
  );
}
