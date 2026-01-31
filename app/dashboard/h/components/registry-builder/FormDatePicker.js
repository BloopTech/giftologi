"use client";
import { DatePicker } from "../../../../components/DatePicker";
import { cx, hasErrorInput } from "../../../../components/utils";

export default function FormDatePicker({
  label,
  name,
  placeholder = "DD/MM/YYYY",
  required = false,
  optional = false,
  error,
  disabled = false,
  disabledDays,
  value,
  onChange,
  className,
}) {
  const hasError = error && error.length > 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900">{label}</label>
          {optional && (
            <span className="text-sm text-[#A5914B]">Optional</span>
          )}
        </div>
      )}
      <input
        type="hidden"
        name={name}
        value={value ? value.toISOString() : ""}
      />
      <DatePicker
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        hasError={hasError}
        disabled={disabled}
        disabledDays={disabledDays}
        className={cx(
          "w-full rounded-full border px-4 py-3 shadow-sm outline-none transition text-sm h-auto",
          "bg-white",
          "border-gray-300",
          "text-gray-900",
          "hover:border-gray-400",
          hasError ? hasErrorInput : "",
          className
        )}
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
