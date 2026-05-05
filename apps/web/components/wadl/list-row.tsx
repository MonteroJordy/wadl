"use client";

import * as React from "react";

interface ListRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  hover?: boolean;
  padding?: string;
}

export function ListRow({
  children,
  onClick,
  hover = true,
  padding = "14px 16px",
}: ListRowProps) {
  const [h, setH] = React.useState(false);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      type={onClick ? "button" : undefined}
      style={{
        padding,
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid var(--w-line)",
        background: hover && h ? "#ffffff04" : "transparent",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        width: "100%",
        border: 0,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: "var(--w-line)",
        color: "inherit",
        font: "inherit",
      }}
    >
      {children}
    </Tag>
  );
}
