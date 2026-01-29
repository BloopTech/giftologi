"use client";
import { forwardRef } from "react";
import { cx, focusInput, hasErrorInput } from "../../../../components/utils";

const FormTextarea = forwardRef(
  (
    {
      label,
      name,
      placeholder,
      required = false,
      optional = false,
      error,
      disabled = false,
      rows = 4,
      className,
      ...props
    },
    ref
  ) => {
    const hasError = error && error.length > 0;

    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={name}
              className="text-sm font-medium text-gray-900"
            >
              {label}
            </label>
            {optional && (
              <span className="text-sm text-[#A5914B]">Optional</span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={name}
          name={name}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={cx(
            "w-full rounded-2xl border px-4 py-3 shadow-sm outline-none transition text-sm resize-none",
            "bg-white",
            "border-gray-300",
            "text-gray-900",
            "placeholder-gray-400",
            "hover:border-gray-400",
            focusInput,
            hasError ? hasErrorInput : "",
            className
          )}
          {...props}
        />
        {hasError && (
          <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
            {error.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";

export default FormTextarea;
