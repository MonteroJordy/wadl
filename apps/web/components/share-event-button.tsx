"use client";

import { useState } from "react";
import { Button } from "@/components/wadl";

export default function ShareEventButton({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch {
        // user dismissed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={share}
      aria-label="Share this event"
    >
      {copied ? "Link copied" : "Share event"}
    </Button>
  );
}
