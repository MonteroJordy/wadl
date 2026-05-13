"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/wadl";

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
        style={{
          pointerEvents: "auto",
          margin: "0 auto",
          maxWidth: 720,
          background: "var(--w-surface-1)",
          border: "1px solid var(--w-line)",
          padding: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            color: "var(--w-fg)",
            opacity: 0.85,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          We use essential cookies for sign-in and a tiny first-party cookie to
          remember this choice.{" "}
          <Link
            href="/privacy#cookies"
            style={{ color: "var(--w-acc)", textDecoration: "underline" }}
          >
            Privacy policy
          </Link>
          .
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="ghost"
            type="button"
            onClick={() => pick("rejected")}
          >
            Reject non-essential
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => pick("accepted")}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
