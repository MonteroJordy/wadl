"use client";

import { useState } from "react";
import { Button, IconCopy } from "@/components/wadl";

interface Props {
  url: string;
  label?: string;
}

/**
 * Client-side clipboard wrapper. We resolve the URL against the page
 * origin so holders share a fully-qualified link (e.g. https://wadl.app/d/abc).
 */
export default function CopyLinkButton({ url, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const full =
      typeof window === "undefined"
        ? url
        : new URL(url, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: open prompt with the URL.
      window.prompt("Copy link:", full);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onCopy}
      style={{ height: 36, padding: "0 12px", fontSize: 12 }}
    >
      {copied ? (
        "✓ Copied"
      ) : (
        <>
          <IconCopy size={14} />
          {label}
        </>
      )}
    </Button>
  );
}
