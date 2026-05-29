"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeWelcomeAction,
  createFirstEventAction,
  skipWelcomeAction,
} from "./actions";
import { useToast } from "@/components/toast";
import {
  accountEntityLabel,
  welcomeStep1Pitch,
} from "@wadl/shared/account-type";
import type { AccountType } from "@wadl/shared/types";
import { Cover, Logo } from "@/components/v5";

interface InitialState {
  fullName: string;
  accountType: AccountType;
  accountName: string;
  hasVenue: boolean;
}

const STEPS = [1, 2, 3, 4, 5] as const;

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  marginBottom: "var(--s-2)",
};

export default function WelcomeWizard({ initial }: { initial: InitialState }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [pending, startTransition] = useTransition();

  // Non-venue accounts (brand / individual) don't set up a room here, so
  // the old step-3 "Heads up" dead-end is skipped entirely for them — the
  // wizard runs 1 → 2 → 4 → 5 and the progress bar collapses to 4 steps.
  const isVenue = initial.accountType === "venue";
  const flow: number[] = isVenue ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
  const stepIndex = flow.indexOf(step);

  // Step 4 inline event form state.
  const [evName, setEvName] = useState("");
  const today = new Date();
  const defaultDate = new Date(today);
  defaultDate.setDate(defaultDate.getDate() + 7);
  const [evDate, setEvDate] = useState(defaultDate.toISOString().slice(0, 10));
  const [evTime, setEvTime] = useState("23:00");
  const [evCap, setEvCap] = useState("100");
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  function next() {
    setStep((s) => {
      const i = flow.indexOf(s);
      return i >= 0 && i < flow.length - 1
        ? (flow[i + 1] as (typeof STEPS)[number])
        : s;
    });
  }
  function back() {
    setStep((s) => {
      const i = flow.indexOf(s);
      return i > 0 ? (flow[i - 1] as (typeof STEPS)[number]) : s;
    });
  }
  function finish(href: string) {
    startTransition(async () => {
      await completeWelcomeAction();
      router.replace(href);
    });
  }
  function skip() {
    startTransition(async () => {
      await skipWelcomeAction();
    });
  }

  function submitFirstEvent(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createFirstEventAction({
        name: evName,
        night_date: evDate,
        doors_at: evTime,
        capacity_cap: parseInt(evCap, 10) || null,
      });
      if (res.ok) {
        toast.success("Event created.");
        setCreatedEventId(res.eventId);
        next();
      } else toast.error(res.error);
    });
  }

  return (
    <main
      id="main-content"
      className="v5"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* Left brand panel — procedural cover, hidden on small screens. */}
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          borderRight: "1px solid var(--line)",
        }}
        className="welcome-cover"
      >
        <Cover
          seed="welcome v5"
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            borderRadius: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "var(--s-12)",
              left: "var(--s-12)",
              color: "#fff",
            }}
          >
            <Logo size={20} color="#fff" />
            <div
              className="t-meta"
              style={{ marginTop: "var(--s-3)", color: "rgba(255,255,255,0.7)" }}
            >
              One door · one list · one truth
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: "var(--s-12)",
              bottom: "var(--s-12)",
              right: "var(--s-12)",
              color: "#fff",
            }}
          >
            <div className="t-display-lg" style={{ color: "#fff" }}>
              Stop losing the door to chaos.
            </div>
            <p
              className="t-body-2"
              style={{
                marginTop: "var(--s-4)",
                color: "rgba(255,255,255,0.8)",
                maxWidth: 420,
              }}
            >
              Replaces the WhatsApp-and-spreadsheet shuffle every busy night
              turns into. Promoters, artists, brands, owner — everyone&apos;s
              on one attributed list. The door scans QRs, the show rate gets
              graded, the next week books itself.
            </p>
            <div
              style={{
                marginTop: "var(--s-8)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--s-3)",
                maxWidth: 420,
              }}
            >
              {[
                ["5m", "to first list"],
                ["0", "accounts on holders"],
                ["∞", "tiers per night"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div
                    className="t-display-sm t-num"
                    style={{ color: "#fff" }}
                  >
                    {v}
                  </div>
                  <div
                    className="t-meta"
                    style={{
                      marginTop: "var(--s-1)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Cover>
      </div>

      {/* Right wizard panel */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          padding: "var(--s-12) var(--s-10)",
          maxWidth: 560,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--s-6)",
          }}
        >
          <p className="t-meta">
            Welcome · step {stepIndex + 1}/{flow.length}
          </p>
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="t-meta"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
            }}
          >
            Skip tour →
          </button>
        </header>

        <div
          style={{
            display: "flex",
            gap: "var(--s-1)",
            marginBottom: "var(--s-8)",
          }}
        >
          {flow.map((s, i) => (
            <div
              key={s}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 99,
                background: i <= stepIndex ? "var(--fg)" : "var(--bg-3)",
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        {step === 1 &&
          (() => {
            const pitch = welcomeStep1Pitch(initial.accountType);
            return (
              <section style={{ flex: 1 }}>
                <h1 className="t-display-md">
                  {pitch.headline.replace(
                    /Welcome\.?/i,
                    `Welcome, ${initial.fullName.split(" ")[0]}.`,
                  )}
                </h1>
                <p
                  className="t-body"
                  style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
                >
                  {pitch.blurb}
                </p>
                <ul
                  style={{
                    marginTop: "var(--s-6)",
                    marginBottom: "var(--s-8)",
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--s-2)",
                  }}
                >
                  {pitch.steps.map((s) => (
                    <li
                      key={s}
                      className="t-body-2"
                      style={{ display: "flex", gap: "var(--s-2)" }}
                    >
                      <span style={{ color: "var(--fg-4)" }}>·</span>
                      {s}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={next}
                  className="btn btn--lg btn--accent"
                >
                  Let&apos;s go →
                </button>
              </section>
            );
          })()}

        {step === 2 && (
          <section style={{ flex: 1 }}>
            <h1 className="t-display-md">Your role</h1>
            <p
              className="t-body"
              style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
            >
              You signed up as{" "}
              <span style={{ color: "var(--fg)", fontWeight: 500 }}>
                {initial.accountType}
              </span>{" "}
              ({initial.accountName}). You can change this later from{" "}
              <Link
                href="/owner/profile"
                style={{ color: "var(--fg)", textDecoration: "underline" }}
              >
                Profile
              </Link>
              .
            </p>
            <div
              className="card"
              style={{ padding: "var(--s-5)", margin: "var(--s-6) 0" }}
            >
              <p className="t-meta">Your account</p>
              <p
                className="t-h1"
                style={{ marginTop: "var(--s-2)" }}
              >
                {initial.accountName}
              </p>
              <p className="t-meta" style={{ marginTop: "var(--s-1)" }}>
                {initial.accountType}
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--s-2)",
              }}
            >
              <button
                type="button"
                onClick={back}
                className="btn btn--ghost"
              >
                ← Back
              </button>
              <button type="button" onClick={next} className="btn btn--accent">
                Next →
              </button>
            </div>
          </section>
        )}

        {step === 3 && isVenue && (
          <section style={{ flex: 1 }}>
            <h1 className="t-display-md">Your venue</h1>
            {initial.hasVenue ? (
              <>
                <p
                  className="t-body"
                  style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
                >
                  Venue already set up — you&apos;re ahead of schedule.
                </p>
                <Link
                  href="/owner/profile"
                  className="btn btn--ghost btn--block"
                  style={{
                    marginTop: "var(--s-6)",
                    textDecoration: "none",
                  }}
                >
                  Edit venues
                </Link>
              </>
            ) : (
              <>
                <p
                  className="t-body"
                  style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
                >
                  Add your first venue (name, address, capacity, door time).
                  You&apos;ll be back here when it&apos;s saved.
                </p>
                <Link
                  href="/venuesetup?return=/welcome"
                  className="btn btn--accent btn--block"
                  style={{
                    marginTop: "var(--s-6)",
                    textDecoration: "none",
                  }}
                >
                  Set up venue →
                </Link>
              </>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--s-2)",
                marginTop: "var(--s-3)",
              }}
            >
              <button
                type="button"
                onClick={back}
                className="btn btn--ghost"
              >
                ← Back
              </button>
              <button type="button" onClick={next} className="btn btn--accent">
                {initial.hasVenue ? "Next →" : "Skip for now"}
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section style={{ flex: 1 }}>
            <h1 className="t-display-md">First event</h1>
            <p
              className="t-body"
              style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
            >
              Name it, pick a date, set capacity. We&apos;ll auto-set cutoff to
              2h before doors. You can edit any of this later.
            </p>
            <form
              onSubmit={submitFirstEvent}
              style={{
                marginTop: "var(--s-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-4)",
              }}
            >
              <div>
                <label className="t-meta" style={LABEL_STYLE} htmlFor="ev-name">
                  Event name
                </label>
                <input
                  id="ev-name"
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  placeholder={
                    accountEntityLabel(initial.accountType).eventPlaceholder
                  }
                  className="input"
                  required
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--s-2)",
                }}
              >
                <div>
                  <label
                    className="t-meta"
                    style={LABEL_STYLE}
                    htmlFor="ev-date"
                  >
                    Date
                  </label>
                  <input
                    id="ev-date"
                    type="date"
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label
                    className="t-meta"
                    style={LABEL_STYLE}
                    htmlFor="ev-time"
                  >
                    Doors
                  </label>
                  <input
                    id="ev-time"
                    type="time"
                    value={evTime}
                    onChange={(e) => setEvTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="t-meta" style={LABEL_STYLE} htmlFor="ev-cap">
                  Capacity
                </label>
                <input
                  id="ev-cap"
                  type="number"
                  min={1}
                  value={evCap}
                  onChange={(e) =>
                    setEvCap(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="input"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--s-2)",
                }}
              >
                <button
                  type="button"
                  onClick={back}
                  className="btn btn--ghost"
                >
                  ← Back
                </button>
                <button type="submit" disabled={pending} className="btn">
                  {pending ? "Creating…" : "Create →"}
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 5 && (
          <section style={{ flex: 1 }}>
            <h1 className="t-display-md">You&apos;re live.</h1>
            <p
              className="t-body"
              style={{ marginTop: "var(--s-3)", color: "var(--fg-2)" }}
            >
              Now invite a holder OR send the magic link straight to a
              promoter. Their list lives under your event.
            </p>
            <div
              style={{
                marginTop: "var(--s-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s-2)",
              }}
            >
              {createdEventId ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      finish(`/owner/events/${createdEventId}/allocations/new`)
                    }
                    className="btn"
                    disabled={pending}
                  >
                    + Invite a holder
                  </button>
                  <button
                    type="button"
                    onClick={() => finish(`/owner/events/${createdEventId}`)}
                    className="btn btn--ghost"
                    disabled={pending}
                  >
                    View the event
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => finish("/owner")}
                  className="btn"
                  disabled={pending}
                >
                  Go to dashboard →
                </button>
              )}
              <button
                type="button"
                onClick={() => finish("/owner")}
                className="t-meta"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: "var(--s-2) 0",
                  textAlign: "center",
                }}
                disabled={pending}
              >
                Skip for now
              </button>
            </div>
          </section>
        )}
      </div>

      <style>{`
        @media (max-width: 860px) {
          .welcome-cover { display: none; }
          main#main-content.v5 { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
