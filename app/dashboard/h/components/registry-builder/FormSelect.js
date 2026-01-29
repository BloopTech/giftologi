"use client";
import { cx, focusInput, hasErrorInput } from "../../../../components/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/Select";
import { ChevronDown } from "lucide-react";

export default function FormSelect({
  label,
  name,
  placeholder,
  required = false,
  optional = false,
  error,
  disabled = false,
  value,
  onValueChange,
  options = [],
  className,
}) {
  const hasError = error && error.length > 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={name} className="text-sm font-medium text-gray-900">
            {label}
          </label>
          {optional && (
            <span className="text-sm text-[#A5914B]">Optional</span>
          )}
        </div>
      )}
      <input type="hidden" name={name} value={value} />
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          className={cx(
            "w-full rounded-full border px-4 py-3 shadow-sm outline-none transition text-sm h-auto",
            "bg-white",
            "border-gray-300",
            "text-gray-900",
            "hover:border-gray-400",
            "[&>span]:text-gray-400 [&[data-state=open]>span]:text-gray-900",
            hasError ? hasErrorInput : "",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
