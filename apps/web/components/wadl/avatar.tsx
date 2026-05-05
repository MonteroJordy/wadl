import * as React from "react";

interface AvatarProps {
  name: string;
  accent?: boolean;
  size?: number;
}

export function Avatar({ name, accent = false, size = 32 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 0,
        background: accent ? "var(--w-acc)" : "#ffffff10",
        color: accent ? "var(--w-acc-ink)" : "var(--w-fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--w-mono)",
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: "0.04em",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
