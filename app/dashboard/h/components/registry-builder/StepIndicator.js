"use client";
import { cx } from "../../../../components/utils";

const steps = [
  { id: 1, label: "Event Details" },
  { id: 2, label: "Delivery Address" },
  { id: 3, label: "Personalise" },
  { id: 4, label: "Privacy" },
];

export default function StepIndicator({ currentStep, steps: stepsOverride }) {
  const activeSteps = Array.isArray(stepsOverride) && stepsOverride.length
    ? stepsOverride
    : steps;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-2">
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A5914B] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / activeSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {activeSteps.map((step) => (
          <span
            key={step.id}
            className={cx(
              "text-xs transition-colors",
              currentStep >= step.id
                ? "text-gray-900 font-medium"
                : "text-gray-400"
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}
