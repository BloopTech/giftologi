"use client";
import { Check } from "lucide-react";
import { cx } from "../../../../components/utils";

export default function FormCheckbox({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  className,
}) {
  return (
    <label
      className={cx(
        "flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={cx(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            checked
              ? "bg-[#A5914B] border-[#A5914B]"
              : "bg-white border-gray-300"
          )}
        >
          {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </div>
      </div>
      {label && <span className="text-sm text-gray-900">{label}</span>}
    </label>
  );
}
