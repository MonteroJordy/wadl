"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_NAME = "wadl_cookie_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readConsent(): "accepted" | "rejected" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)wadl_cookie_consent=(accepted|rejected)/);
  return (m?.[1] as "accepted" | "rejected" | undefined) ?? null;
}

function writeConsent(v: "accepted" | "rejected") {
  document.cookie = `${COOKIE_NAME}=${v}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setShow(true);
  }, []);

  if (!show) return null;

  function pick(v: "accepted" | "rejected") {
    writeConsent(v);
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:px-6 md:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-2xl bg-s1 border border-line rounded-lg p-4 md:p-5 shadow-2xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 text-sm text-cream/80 leading-relaxed">
          We use essential cookies for sign-in and a tiny first-party cookie
          to remember this choice.{" "}
          <Link href="/privacy#cookies" className="text-coral underline">
            Privacy policy
          </Link>
          .
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => pick("rejected")}
            className="border border-line text-cream font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 py-2 rounded-md hover:border-cream/30 transition"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={() => pick("accepted")}
            className="bg-coral text-bg font-sans font-semibold text-xs uppercase tracking-[0.14em] px-4 py-2 rounded-md hover:brightness-110 transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
