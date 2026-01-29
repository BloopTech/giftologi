"use client";
import { Check } from "lucide-react";
import { cx } from "../../../../../components/utils";

function RadioOption({ label, description, value, selected, onChange, disabled }) {
  return (
    <label
      className={cx(
        "flex items-start gap-3 cursor-pointer select-none py-2",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="relative mt-0.5">
        <input
          type="radio"
          checked={selected}
          onChange={() => onChange(value)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={cx(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
            selected
              ? "bg-[#A5914B] border-[#A5914B]"
              : "bg-white border-gray-300"
          )}
        >
          {selected && (
            <div className="w-2 h-2 bg-white rounded-full" />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-sm text-gray-500">{description}</span>
      </div>
    </label>
  );
}

export default function PrivacyStep({
  formData,
  updateFormData,
  errors = {},
  disabled = false,
}) {
  const privacyValue = formData.privacy || "public";

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-700">
        Choose who can search and view your registry online.
      </p>

      <div className="space-y-2">
        <RadioOption
          label="Public"
          description="Anyone can search for and view your registry."
          value="public"
          selected={privacyValue === "public"}
          onChange={(value) => updateFormData("privacy", value)}
          disabled={disabled}
        />
        <RadioOption
          label="Private"
          description="Only people with a link to your registry can view it."
          value="private"
          selected={privacyValue === "private"}
          onChange={(value) => updateFormData("privacy", value)}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-2 pt-4 text-sm text-gray-500">
        <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
          <Check className="w-3 h-3 text-gray-400" />
        </div>
        <span>Choose who can search and view your registry online.</span>
      </div>
    </div>
  );
}
