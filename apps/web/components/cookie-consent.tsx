"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_NAME = "wadl_cookie_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readConsent(): "accepted" | "rejected" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    /(?:^|;\s*)wadl_cookie_consent=(accepted|rejected)/,
  );
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
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        padding: 12,
        pointerEvents: "none",
      }}
    >
      <div
        className="card"
        style={{
          pointerEvents: "auto",
          margin: "0 auto",
          maxWidth: 720,
          padding: "var(--s-5)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          gap: "var(--s-4)",
          flexWrap: "wrap",
        }}
      >
        <div
          className="t-body-2"
          style={{ flex: 1, minWidth: 240, lineHeight: 1.5 }}
        >
          We use essential cookies for sign-in and a tiny first-party cookie to
          remember this choice.{" "}
          <Link
            href="/privacy#cookies"
            style={{ color: "var(--fg)", textDecoration: "underline" }}
          >
            Privacy policy
          </Link>
          .
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--s-2)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => pick("rejected")}
          >
            Reject non-essential
          </button>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => pick("accepted")}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
