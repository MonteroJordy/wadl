import * as React from "react";

type Variant = "primary" | "solid" | "ghost";
type Size = "md" | "lg";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      block = false,
      className = "",
      children,
      ...rest
    },
    ref,
  ) {
    const cls = [
      "w-btn",
      `w-btn--${variant}`,
      size === "lg" ? "w-btn--lg" : "",
      block ? "w-btn--block" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <button ref={ref} className={cls} {...rest}>
        {children}
      </button>
    );
  },
);
