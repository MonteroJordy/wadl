import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, id, className = "", ...rest }, ref) {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <div>
        {label ? (
          <label htmlFor={inputId} className="w-label">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={["w-input", className].filter(Boolean).join(" ")}
          {...rest}
        />
      </div>
    );
  },
);
