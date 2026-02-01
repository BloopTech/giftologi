"use client";
import { forwardRef } from "react";
import { cx, focusInput, hasErrorInput } from "../../../../components/utils";

const FormInput = forwardRef(
  (
    {
      label,
      name,
      type = "text",
      placeholder,
      required = false,
      optional = false,
      error,
      disabled = false,
      className,
      icon,
      ...props
    },
    ref,
  ) => {
    const hasError = error && error.length > 0;

    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={name} className="text-sm font-medium text-gray-900">
              {label}{" "}
              {required ? <span className="text-red-600">*</span> : null}
            </label>
            {optional && (
              <span className="text-sm text-[#A5914B]">Optional</span>
            )}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={cx(
              "w-full rounded-full border px-4 py-3 shadow-sm outline-none transition text-sm",
              "bg-white",
              "border-gray-300",
              "text-gray-900",
              "placeholder-gray-400",
              "hover:border-gray-400",
              focusInput,
              hasError ? hasErrorInput : "",
              icon ? "pr-10" : "",
              className,
            )}
            {...props}
          />
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
        </div>
        {hasError && (
          <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
            {error.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";

export default FormInput;
