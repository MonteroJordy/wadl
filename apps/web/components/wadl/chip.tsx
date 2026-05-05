import * as React from "react";

type ChipTone = "neutral" | "acc" | "ok" | "warn" | "err" | "ghost";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

export function Chip({
  tone = "neutral",
  className = "",
  children,
  ...rest
}: ChipProps) {
  const cls = [
    "w-chip",
    tone === "neutral" ? "" : `w-chip--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
