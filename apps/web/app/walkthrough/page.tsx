"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/v5";

interface Step {
  title: string;
  sub: string;
  cta: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to WADL",
    sub: "One door. One list. One truth. We'll take you through the basics so you can run your first night by the end of the week.",
    cta: "Show me around",
  },
  {
    title: "Open a door in 60 seconds",
    sub: "Pick a venue type, add basics, publish. The RSVP page goes live the moment you save — no review, no approval.",
    cta: "Continue",
  },
  {
    title: "Invite holders, not customers",
    sub: "Each holder gets a magic link — no signup. They add names, you see who came. Promoters keep their reps in their head; WADL keeps the receipts.",
    cta: "Got it",
  },
  {
    title: "The scanner is offline-first",
    sub: "iPhone, dark room, no signal — still works. Queues every scan, syncs the moment it's back online. Walk-ins get a row too.",
    cta: "Take me in",
  },
];

export default function WalkthroughPage() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const total = STEPS.length;
  const step = STEPS[i];
  const isLast = i === total - 1;

  function next() {
    if (isLast) router.push("/owner");
    else setI(i + 1);
  }

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
        {/* Progress pips */}
        <div
          style={{
            display: "flex",
            gap: "var(--s-1)",
            justifyContent: "center",
            marginBottom: "var(--s-8)",
          }}
        >
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: 32,
                height: 3,
                borderRadius: 99,
                background:
                  idx === i
                    ? "var(--accent-grad)"
                    : idx < i
                      ? "var(--fg-3)"
                      : "var(--bg-3)",
                transition: "background 160ms ease-out",
              }}
            />
          ))}
        </div>

        <Logo size={20} />
        <h1 className="t-display-md" style={{ marginTop: "var(--s-8)" }}>
          {step.title}
        </h1>
        <p
          className="t-body-2"
          style={{
            marginTop: "var(--s-3)",
            color: "var(--fg-2)",
            lineHeight: 1.5,
            maxWidth: 460,
            margin: "var(--s-3) auto 0",
          }}
        >
          {step.sub}
        </p>

        <div
          style={{
            marginTop: "var(--s-8)",
            display: "flex",
            gap: "var(--s-2)",
            justifyContent: "center",
          }}
        >
          <Link
            href="/owner"
            className="btn btn--ghost"
            style={{ textDecoration: "none" }}
          >
            Skip
          </Link>
          <button type="button" onClick={next} className="btn btn--accent">
            {isLast ? "Open dashboard →" : step.cta}
          </button>
        </div>

        <div
          className="t-meta"
          style={{
            marginTop: "var(--s-6)",
            color: "var(--fg-3)",
          }}
        >
          {i + 1} of {total}
        </div>
      </div>
    </main>
  );
}
