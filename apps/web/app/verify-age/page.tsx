"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/v5";

export default function VerifyAgePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/mytickets";
  const minAge = parseInt(sp.get("min") ?? "21", 10);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  function onConfirm() {
    if (!file) {
      fileRef.current?.click();
      return;
    }
    setSubmitting(true);
    // Stash a local flag so the user isn't re-prompted on this device.
    // The real ID-check pipeline (provider + yes/no persistence) lands with
    // the venue-settings + privacy migration. For now the page is the
    // friction reducer — the venue still verifies in person.
    try {
      window.localStorage.setItem("wadl_age_verified", "1");
    } catch {
      /* ignore */
    }
    window.setTimeout(() => router.push(next), 600);
  }

  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "var(--s-4) var(--s-5)",
          display: "flex",
          alignItems: "center",
          gap: "var(--s-3)",
        }}
      >
        <Link
          href={next}
          aria-label="Back"
          style={{
            textDecoration: "none",
            color: "var(--fg-2)",
            fontSize: 18,
          }}
        >
          ←
        </Link>
        <Logo size={18} mark />
      </header>

      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "var(--s-5)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s-5)",
        }}
      >
        <div>
          <span className="chip chip--warn">{minAge}+ required</span>
          <h1
            className="t-display-sm"
            style={{ marginTop: "var(--s-4)", lineHeight: 1.15 }}
          >
            Verify your age,
            <br />
            once.
          </h1>
          <p
            className="t-body-2"
            style={{
              marginTop: "var(--s-2)",
              color: "var(--fg-2)",
              lineHeight: 1.5,
            }}
          >
            We confirm a yes/no and discard the photo. The venue never sees
            your ID — only the answer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="card"
          style={{
            aspectRatio: "4 / 3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "var(--s-2)",
            background: file ? "var(--bg-2)" : "var(--bg-3)",
            borderStyle: "dashed",
            cursor: "pointer",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {file ? "✓" : "+"}
          </div>
          <div className="t-body-2">
            {file
              ? `Picked: ${file.name.slice(0, 28)}${file.name.length > 28 ? "…" : ""}`
              : "Scan your driver's license"}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            style={{ display: "none" }}
            aria-label="ID photo"
          />
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="btn btn--lg btn--accent btn--block"
        >
          {submitting
            ? "Verifying…"
            : file
              ? "Confirm"
              : "Open camera"}
        </button>
        <Link
          href={next}
          className="btn btn--ghost btn--block"
          style={{ textDecoration: "none" }}
        >
          I&apos;ll do it at the door
        </Link>

        <p
          className="t-meta"
          style={{
            textAlign: "center",
            color: "var(--fg-3)",
            lineHeight: 1.5,
          }}
        >
          Photo verification is local-only today — the cryptographic ID-check
          provider ships with the privacy migration. Doors still verify in
          person.
        </p>
      </div>
    </main>
  );
}
