import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={["w-card", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
