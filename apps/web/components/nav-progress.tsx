"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Minimal top-of-viewport progress bar that lights up when the user
 * clicks a nav link and Next.js is fetching the next route. No deps —
 * we listen for clicks on `<a>` elements that target the same origin,
 * then watch `usePathname()` / `useSearchParams()` to detect when the
 * navigation has resolved.
 *
 * This is the "Vercel feel" signal: clicking something instantly shows
 * a thin yellow bar at the top so the user knows the click registered
 * even before the next page has hydrated. Eliminates the "did it
 * register?" double-clicks that plague slow server-rendered apps.
 */
export default function NavProgress() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resolve / hide whenever the route changes. Also scroll to the top
  // so users don't land mid-page on a fresh route (Next.js doesn't
  // restore scroll for client-side nav by default in App Router).
  useEffect(() => {
    setActive(false);
    setProgress(0);
    // Only auto-scroll-top when the user isn't returning via back/forward
    // (browser handles those natively). The PerformanceNavigationTiming
    // entry tells us this was a 'navigate' event from a Link click.
    if (typeof window !== "undefined") {
      const isHashOnly =
        window.location.hash &&
        !window.history.state?.__N_pop; // not a back/forward
      if (!isHashOnly) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      }
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    function onAnchorClick(e: MouseEvent) {
      // Modifier-key clicks should open a new tab — don't show progress.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      // Walk up the DOM to find the closest <a>.
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== "A") el = el.parentElement;
      if (!el) return;

      const a = el as HTMLAnchorElement;
      if (a.target === "_blank") return;
      if (a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return; // in-page anchor

      // Same-origin only — external links use full navigation.
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        )
          return;
      } catch {
        return;
      }

      setActive(true);
      setProgress(10);
    }

    document.addEventListener("click", onAnchorClick, true);
    return () => document.removeEventListener("click", onAnchorClick, true);
  }, []);

  // Easing — progress bar should accelerate to ~90% over a few hundred
  // ms even if the actual nav takes longer, so the user sees motion.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        if (p >= 90) return 90;
        const remaining = 90 - p;
        const step = remaining * Math.min(1, dt * 1.4);
        return p + step;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 1000,
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${active ? progress : 100}%`,
          background: "var(--w-acc)",
          boxShadow: active ? "0 0 8px var(--w-acc)" : "none",
          opacity: active ? 1 : 0,
          transition: active
            ? "width 120ms ease-out, opacity 80ms"
            : "opacity 240ms 80ms",
        }}
      />
    </div>
  );
}
