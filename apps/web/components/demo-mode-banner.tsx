import Link from "next/link";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * Sticky banner rendered at the top of every authed surface when demo mode
 * is on. Server component so the cookie read happens once on render and the
 * banner never flashes off during hydration.
 */
export default function DemoModeBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="sticky top-0 z-50 bg-coral text-bg px-4 py-1.5 flex items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.18em]">
      <span>● Demo mode — sample data · SMS muted</span>
      <Link href="/demo-mode" className="underline hover:no-underline">
        manage
      </Link>
    </div>
  );
}
